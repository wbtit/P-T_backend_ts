/**
 * Phase 2 build item 3 — ingestion wire-up.
 *
 * Orchestrates one document end to end:
 *   1. run the Python extractor (dry-run; it never touches the database)
 *   2. read the per-page manifests
 *   3. chunk them
 *   4. embed everything that needs an embedding
 *   5. persist pages, chunks, and heading provenance
 *
 * Step 5 is the only step that writes, and it is gated behind an explicit
 * `commit` flag. Called without it, this runs 1-4 and reports what it WOULD
 * write — which is how the dry-run half of the exit criteria is produced.
 */
import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import util from "util";

import prisma from "../../../config/database/client";
import {
  chunkDocument,
  requiresEmbedding,
  EMBED_CHAR_BUDGET,
  type ChunkedDocument,
} from "../services/manifestChunking";
import {
  persistChunks,
  persistHeadingMeta,
  persistPages,
  reportEmbedTruncationRisk,
} from "../services/manifestPersistence";

const execFileAsync = util.promisify(execFile);

/** The extractor needs the Python 3.12 environment: paddlepaddle publishes no
 *  3.14 wheels, so PaddleOCR only exists there. */
const PYTHON =
  process.env.FABEXTRACT_PYTHON || `${process.env.HOME}/benchmark-env-paddle/bin/python3`;
/**
 * Root of the Python package — the cwd `python -m fabextract.cli` runs from.
 *
 * Resolved by probing rather than a fixed hop count, because `__dirname` differs
 * between ts-node (`src/modules/standards/jobs`) and a compiled build
 * (`dist/modules/standards/jobs`), and `tsc` emits no .py files — so under dist
 * the sibling path does not exist and the source tree must be found instead.
 */
function resolveExtractionRoot(): string {
  if (process.env.FABEXTRACT_ROOT) return process.env.FABEXTRACT_ROOT;
  const candidates = [
    path.resolve(__dirname, "../extraction"), // ts-node: src/modules/standards/extraction
    path.resolve(process.cwd(), "src/modules/standards/extraction"), // compiled: from repo root
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "fabextract", "cli.py"))) return c;
  }
  throw new Error(
    `fabextract package not found. Looked in: ${candidates.join(", ")}. ` +
      `Set FABEXTRACT_ROOT to its directory.`
  );
}

export interface IngestOptions {
  documentId: string;
  pdfPath: string;
  manifestDir: string;
  sourceType: "GENERAL" | "FABRICATOR" | "PROJECT";
  projectId?: string | null;
  fabricatorId?: string | null;
  documentFamilyId?: string | null;
  edition?: string | null;
  /** Nothing is written unless this is true. */
  commit?: boolean;
  /** Reuse manifests already on disk instead of re-running the extractor. */
  skipExtraction?: boolean;
}

export interface IngestReport {
  documentId: string;
  committed: boolean;
  pages: number;
  chunks: number;
  byType: Record<string, number>;
  parents: number;
  children: number;
  embedded: number;
  notEmbedded: number;
  truncationRisk: number;
  truncated?: EmbedStats["truncated"];
  headingMeta: Record<string, unknown> | null;
  written?: {
    pages: number;
    deletedChunks: number;
    insertedParents: number;
    insertedChildren: number;
  };
}

/** Run the extractor. Dry-run is its only mode; it writes manifests and images
 *  and never opens a database connection. */
export async function runExtractor(pdfPath: string, manifestDir: string, documentId: string) {
  const args = [
    "-m",
    "fabextract.cli",
    pdfPath,
    "--out-dir",
    manifestDir,
    "--document-id",
    documentId,
    "--log-file",
    path.join(manifestDir, "extract.log"),
  ];
  const { stdout } = await execFileAsync(PYTHON, args, {
    cwd: resolveExtractionRoot(),
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

function readSummary(manifestDir: string): Record<string, any> | null {
  const p = path.join(manifestDir, "_summary.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Embedding stays where it already lives — same Ollama endpoint and model the
 *  existing retrieval/chunking code uses. */
async function generateEmbedding(text: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama embeddings failed: ${response.status} ${body.slice(0, 200)}`);
  }
  const data = (await response.json()) as { embedding: number[] };
  if (!data.embedding || data.embedding.length === 0) {
    throw new Error("Empty embedding received from Ollama");
  }
  return data.embedding;
}

/**
 * Progressively smaller truncation budgets.
 *
 * nomic-embed-text is capped at 2048 TOKENS and Ollama rejects an over-long
 * input with a 500 ("the input length exceeds the context length") — it does
 * NOT truncate. Because the cap is in tokens, no character budget is exact:
 * measured, repetitive prose embedded fine at 12,726 chars (~6.2 chars/token)
 * while dense technical text failed at 8,185 (~4 chars/token). So the budget is
 * a starting guess and the ladder is what actually finds a length that fits.
 *
 * `num_ctx` does not help — confirmed ignored by the embeddings endpoint at
 * both 8192 and 32768.
 */
const TRUNCATION_LADDER = [1.0, 0.8, 0.6, 0.45, 0.3];

export interface EmbedStats {
  truncated: { localId: string; chunkType: string; page: number; from: number; to: number; attempts: number }[];
}

async function embedChunks(
  chunked: ChunkedDocument,
  budget: number = EMBED_CHAR_BUDGET
): Promise<{ embeddings: Map<string, number[]>; stats: EmbedStats }> {
  const embeddings = new Map<string, number[]>();
  const stats: EmbedStats = { truncated: [] };

  for (const c of chunked.chunks) {
    // An EXTRACTED table parent is deliberately left unembedded: it ranks via
    // its max-pooled children, and it is the chunk most likely to exceed the cap.
    if (!requiresEmbedding(c)) continue;

    const full = c.textContent;

    // The ladder applies to every chunk, not only ones already over budget.
    // An earlier version fast-pathed anything <= budget straight to
    // generateEmbedding() with no fallback -- and SJI p199's table row (4,001
    // chars, well under the 4,500 budget) still got a real 500 from Ollama
    // ("the input length exceeds the context length"). Amendment 7's point
    // exactly: char count is not a reliable proxy for token count, and a
    // static budget is a starting guess, not a guarantee -- including for
    // text the budget says should be safe. Rung 1 is the full text when it is
    // within budget (matching the old fast path's common case exactly, same
    // number of Ollama calls), or the budget-length prefix when it is not.
    const rungs = [Math.min(full.length, budget)];
    for (const factor of TRUNCATION_LADDER.slice(1)) {
      const limit = Math.floor(budget * factor);
      if (limit < rungs[rungs.length - 1]) rungs.push(limit);
    }

    let lastErr: unknown = null;
    let attempts = 0;
    for (const limit of rungs) {
      attempts++;
      try {
        const vec = await generateEmbedding(full.slice(0, limit));
        embeddings.set(c.localId, vec);
        if (limit < full.length) {
          console.error(
            `[embed-truncated] document=${chunked.documentId} page=${c.pageStart} ` +
              `chunkType=${c.chunkType} localId=${c.localId} originalChars=${full.length} ` +
              `embeddedChars=${limit} attempts=${attempts} ` +
              `-- vector covers a prefix only; stored text is complete`
          );
          stats.truncated.push({
            localId: c.localId, chunkType: c.chunkType, page: c.pageStart,
            from: full.length, to: limit, attempts,
          });
        }
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) {
      // Never silently skip: a chunk with no embedding is unretrievable, and
      // for a VISUAL chunk that is the only way its page can be found.
      throw new Error(
        `chunk ${c.localId} (page ${c.pageStart}, ${c.chunkType}, ${full.length} chars) could ` +
          `not be embedded after ${attempts} attempts down to ${rungs[rungs.length - 1]} ` +
          `chars: ${lastErr}`
      );
    }
  }
  return { embeddings, stats };
}

export async function ingestDocument(opts: IngestOptions): Promise<IngestReport> {
  const { documentId, pdfPath, manifestDir, sourceType } = opts;

  if (!opts.skipExtraction) {
    await runExtractor(pdfPath, manifestDir, documentId);
  }

  const chunked = chunkDocument(manifestDir, {
    documentFamilyId: opts.documentFamilyId ?? null,
    edition: opts.edition ?? null,
  });
  const summary = readSummary(manifestDir);
  const headingMeta = (summary?.headingMeta as Record<string, unknown>) ?? null;

  const byType: Record<string, number> = {};
  for (const c of chunked.chunks) byType[c.chunkType] = (byType[c.chunkType] ?? 0) + 1;
  const parents = chunked.chunks.filter((c) => c.parentLocalId === null).length;
  const children = chunked.chunks.length - parents;
  const needsEmbedding = chunked.chunks.filter(requiresEmbedding).length;
  const truncation = reportEmbedTruncationRisk(chunked);

  const report: IngestReport = {
    documentId,
    committed: false,
    pages: chunked.pages.length,
    chunks: chunked.chunks.length,
    byType,
    parents,
    children,
    embedded: needsEmbedding,
    notEmbedded: chunked.chunks.length - needsEmbedding,
    truncationRisk: truncation.length,
    headingMeta,
  };

  if (!opts.commit) {
    return report;
  }

  // ---- the only writing path ----
  const { embeddings, stats: embedStats } = await embedChunks(chunked);
  const pagesWritten = await persistPages(chunked, documentId);
  const chunkResult = await persistChunks(chunked, {
    documentId,
    sourceType,
    projectId: opts.projectId ?? null,
    fabricatorId: opts.fabricatorId ?? null,
    embeddings,
  });
  if (headingMeta) {
    await persistHeadingMeta(documentId, {
      noHeadingsDetected: headingMeta.noHeadingsDetected as boolean | null,
      headingCoverageRatio: headingMeta.headingCoverageRatio as number | null,
      outlineCoverageRatio: headingMeta.outlineCoverageRatio as number | null,
      outlineFillEnabled: headingMeta.outlineFillApplied as boolean | null,
    });
  }
  await prisma.standardDocument.update({
    where: { id: documentId },
    data: { pagesProcessed: pagesWritten, totalPages: chunked.pages.length },
  });

  report.committed = true;
  report.truncated = embedStats.truncated;
  report.written = {
    pages: pagesWritten,
    deletedChunks: chunkResult.deletedChunks,
    insertedParents: chunkResult.insertedParents,
    insertedChildren: chunkResult.insertedChildren,
  };
  return report;
}
