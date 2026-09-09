/**
 * Phase 2 build item 3 — manifest in, chunks out.
 *
 * Pure transformation. This module reads the per-page JSON manifests written by
 * the Python extractor and produces chunk records. It does not touch the
 * database, does not embed, and does not do IO beyond reading manifest files —
 * so it is testable without either.
 *
 * Chunking rules, all from the Phase 2 spec:
 *   - Prose is chunked by heading. A page with no trusted heading chunks by
 *     page with heading = null. Never invent a heading, never fall back to the
 *     document title, never carry one across a page boundary (the gated
 *     outline fill already did that upstream, or deliberately did not).
 *   - Every table becomes one atomic PARENT chunk — that is its citation
 *     identity, and it carries the full serialized grid.
 *   - An EXTRACTED table also gets row-group CHILD chunks: header row plus up
 *     to ROW_GROUP_SIZE data rows each, embedded separately and max-pooled to
 *     the parent at query time.
 *   - A VISUAL_ONLY table is parent-only: no children, no grid, locating text
 *     only. Cell values are never asserted for a table we could not verify.
 *
 * Invariant this module guarantees, which retrieval depends on:
 *
 *     a table chunk has children  <=>  the table was EXTRACTED
 *
 * That is why an EXTRACTED table always gets at least one child even when its
 * rows fit in a single group. Measured on the current corpus, 34% of tables fit
 * in one group; skipping their children would save a handful of embeddings but
 * would silently drop every small table out of the table branch, which scores
 * children. The invariant is worth more than the embeddings.
 */
import fs from "fs";
import path from "path";

/** Header row + this many data rows per child chunk. */
export const ROW_GROUP_SIZE = 10;

/**
 * RULE — every retrieval query EXCEPT the table branch must include this
 * predicate.
 *
 * Row-group children are a ranking device, never a citable result. A plain
 * vector search over standard_chunks returns them alongside parents, and a
 * child is a fragment of a table with no table identity — citing one is the
 * fragment-citation failure this whole parent/child design exists to prevent.
 *
 * The table branch is the single exception: it deliberately scores children,
 * then max-pools to the parent and returns the PARENT.
 */
export const NON_CHILD_FILTER = "parent_chunk_id IS NULL";

/**
 * Which chunks get an embedding.
 *
 * An EXTRACTED table parent gets `embedding = NULL`. It ranks through its
 * max-pooled children and never on its own vector, so embedding it buys
 * nothing — and it is the one chunk that would blow past nomic-embed-text's
 * 2048-token cap, since it carries the whole serialized grid. Ollama truncates
 * silently rather than erroring, so a large parent would carry a vector
 * representing only its opening rows while looking perfectly healthy. Not
 * embedding it removes that failure mode instead of managing it. Every child
 * repeats the header row, so header matching is still covered.
 *
 * Everything else is embedded, including the VISUAL locating chunk of a
 * visual-only page — that embedding is precisely how such a page is findable,
 * and it is short (heading + prose + OCR), so no truncation risk.
 */
export function requiresEmbedding(c: DraftChunk): boolean {
  const isTableParent = c.chunkType === "TABLE" && c.parentLocalId === null;
  return !isTableParent;
}

export type ExtractionStatus = "EXTRACTED" | "VISUAL_ONLY";
export type VisualOnlyReason =
  | "EMPTY"
  | "UNMAPPED_GLYPH"
  | "DUPLICATE_TEXT"
  | "NO_CONFIDENT_REGION"
  | "SCANNED";
export type HeadingSource = "OUTLINE" | "REGEX" | "NULL_SOURCE";
export type ChunkType = "PROSE" | "TABLE" | "VISUAL";

export interface ManifestTable {
  bbox: number[];
  status: string;
  refinementApplied: boolean;
  rowHeightRatio: number | null;
  nRows: number;
  nCols: number;
  cells: string[][];
}

export interface PageManifest {
  documentId: string | null;
  pageIndex: number;
  pageNumber: number;
  validity: { status: string; reason: string };
  heading: {
    heading?: string | null;
    breadcrumb?: string[];
    headingSource?: string | null;
  };
  tables: ManifestTable[];
  rejectedRegions: { bbox: number[]; reason: string }[];
  proseText: string;
  ocrText: string;
  extractionMethod: string;
  extractionStatus: ExtractionStatus;
  visualOnlyReason: VisualOnlyReason | null;
  imagePath?: string | null;
}

/** A chunk ready for persistence. `localId`/`parentLocalId` are resolved to
 *  real UUIDs by the persistence layer, which owns id generation. */
export interface DraftChunk {
  localId: string;
  parentLocalId: string | null;
  chunkType: ChunkType;
  pageStart: number;
  pageEnd: number;
  textContent: string;
  heading: string | null;
  headingSource: HeadingSource;
  rowGroupIndex: number | null;
  documentFamilyId: string | null;
  edition: string | null;
}

export interface ChunkingOptions {
  documentFamilyId?: string | null;
  edition?: string | null;
  rowGroupSize?: number;
}

/** Serialize a row as `header: value` pairs so a row group carries its own
 *  column meaning. A row embedded as bare values retrieves poorly — the header
 *  is what makes "3/4 in. bolt" match a cell that only says `3/4`. */
/** A merged fraction cell stays on one line: "1 1/4", never split across a
 *  newline (spec §4). Applies to header keys too — a multi-line label cell like
 *  "DESIGN\nINFORMATION" must not inject a newline mid-pair. */
function flattenCell(c: string | undefined): string {
  return (c ?? "").replace(/\s*\n\s*/g, " ").trim();
}

export function serializeRow(header: string[], row: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < row.length; i++) {
    const value = flattenCell(row[i]);
    if (!value) continue;
    const key = flattenCell(header[i]);
    parts.push(key ? `${key}: ${value}` : value);
  }
  return parts.join(" | ");
}

/** The whole table, as the parent's citation text. */
export function serializeGrid(cells: string[][]): string {
  return cells
    .map((row) => row.map((c) => (c ?? "").replace(/\s*\n\s*/g, " ").trim()).join(" | "))
    .join("\n");
}

/** First non-empty row is the header. Tables whose first row is a title
 *  spanning one cell are common, so fall back to the first row with more than
 *  one non-empty cell. */
export function pickHeaderRow(cells: string[][]): string[] {
  for (const row of cells) {
    const nonEmpty = row.filter((c) => (c ?? "").trim()).length;
    if (nonEmpty > 1) return row;
  }
  return cells[0] ?? [];
}

function headingSourceOf(m: PageManifest): HeadingSource {
  const src = m.heading?.headingSource;
  if (src === "OUTLINE" || src === "REGEX") return src;
  return "NULL_SOURCE";
}

function headingOf(m: PageManifest): string | null {
  const h = m.heading?.heading;
  return h && h.trim() ? h : null;
}

let counter = 0;
function nextLocalId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/** Reset the local-id counter. Tests only. */
export function __resetLocalIds(): void {
  counter = 0;
}

/**
 * Build chunks for one page.
 *
 * A page that failed validity (§1) or found no confident region (§2) still
 * produces chunks — its prose and its OCR text remain useful for locating the
 * page — but no table on it is ever EXTRACTED, so no children are emitted.
 */
export function chunkPage(m: PageManifest, opts: ChunkingOptions = {}): DraftChunk[] {
  const rowGroupSize = opts.rowGroupSize ?? ROW_GROUP_SIZE;
  const out: DraftChunk[] = [];
  const heading = headingOf(m);
  const headingSource = headingSourceOf(m);
  const base = {
    pageStart: m.pageNumber,
    pageEnd: m.pageNumber,
    heading,
    headingSource,
    documentFamilyId: opts.documentFamilyId ?? null,
    edition: opts.edition ?? null,
  };

  // --- prose -------------------------------------------------------------
  // On a scanned page the OCR text IS the prose: retrieval-grade, never
  // asserted values. Where a page has both (rare), both are kept, OCR last.
  const proseParts: string[] = [];
  if (m.proseText && m.proseText.trim()) proseParts.push(m.proseText.trim());
  if (m.ocrText && m.ocrText.trim()) proseParts.push(m.ocrText.trim());
  const prose = proseParts.join("\n\n");
  if (prose) {
    out.push({
      ...base,
      localId: nextLocalId("prose"),
      parentLocalId: null,
      chunkType: "PROSE",
      textContent: prose,
      rowGroupIndex: null,
    });
  }

  // --- tables ------------------------------------------------------------
  for (const table of m.tables) {
    const parentId = nextLocalId("table");
    const grid = serializeGrid(table.cells);
    out.push({
      ...base,
      localId: parentId,
      parentLocalId: null,
      chunkType: "TABLE",
      textContent: grid,
      rowGroupIndex: null,
    });

    const header = pickHeaderRow(table.cells);
    const headerLine = header.map(flattenCell).filter(Boolean).join(" | ");
    const dataRows = table.cells.filter((r) => r !== header);

    let emitted = 0;
    for (let i = 0; i < dataRows.length; i += rowGroupSize) {
      const slice = dataRows.slice(i, i + rowGroupSize);
      const body = slice
        .map((r) => serializeRow(header, r))
        .filter((s) => s.trim())
        .join("\n");
      // A group of entirely blank rows carries nothing; skip it rather than
      // embedding the header on its own. Group index counts emitted groups, so
      // indices stay contiguous.
      if (!body) continue;
      out.push({
        ...base,
        localId: nextLocalId("rows"),
        parentLocalId: parentId,
        chunkType: "TABLE",
        textContent: headerLine ? `${headerLine}\n${body}` : body,
        rowGroupIndex: emitted,
      });
      emitted++;
    }

    // Invariant: children exist iff the table was EXTRACTED. A degenerate table
    // — one that clears the >=2x2 gate and has at least one non-empty cell, but
    // whose data rows are all blank — would otherwise end up with a parent and
    // no children, and silently drop out of the table branch, which scores
    // children. Seen for real: Expansion_Anchor p14 has a 4x4 region whose only
    // content is "A N". Emit one child carrying the parent's grid so the table
    // stays retrievable and the invariant holds.
    if (emitted === 0) {
      out.push({
        ...base,
        localId: nextLocalId("rows"),
        parentLocalId: parentId,
        chunkType: "TABLE",
        textContent: grid,
        rowGroupIndex: 0,
      });
    }
  }

  return out;
}

/**
 * A VISUAL_ONLY table, i.e. one this pipeline could not verify. Parent only:
 * no children, no grid. `textContent` is locating text so the page can be
 * found, never cell values.
 */
export function visualOnlyTableChunk(
  m: PageManifest,
  opts: ChunkingOptions = {}
): DraftChunk {
  const locating = [headingOf(m), m.proseText?.trim(), m.ocrText?.trim()]
    .filter((s) => s && s.length)
    .join("\n\n");
  return {
    localId: nextLocalId("visual"),
    parentLocalId: null,
    chunkType: "VISUAL",
    pageStart: m.pageNumber,
    pageEnd: m.pageNumber,
    textContent: locating,
    heading: headingOf(m),
    headingSource: headingSourceOf(m),
    rowGroupIndex: null,
    documentFamilyId: opts.documentFamilyId ?? null,
    edition: opts.edition ?? null,
  };
}

/**
 * Character budget for a single embedding request.
 *
 * nomic-embed-text is hard-capped at 2048 TOKENS and Ollama REJECTS an
 * over-long input with a 500 ("the input length exceeds the context length").
 * It does not truncate. So this budget gates whether the ingest truncates for
 * the embedding before asking — `text_content` is always stored complete.
 *
 * 4500, lowered from 7000 on measured evidence. The first real over-budget
 * chunk (Expansion_Anchor p15, Hilti terms-and-conditions, 8,185 chars) needed
 * THREE rungs of the retry ladder: 7,000 failed, 5,600 failed, 4,200 passed.
 * Its true ceiling is between 4,200 and 5,600 chars — about 2.1-2.7 chars per
 * token, against roughly 6.2 on clean prose. That ~3x spread is driven by
 * space-stripped extraction (`PAYMENTTERMS:`, `Customeragreestopayall`), which
 * the tokenizer sees as single words and explodes into subword tokens.
 *
 * No single number covers a 3x spread, so the ladder stays. 4500 just makes
 * the first rung succeed in the common case instead of burning two round-trips.
 */
export const EMBED_CHAR_BUDGET = Number(
  process.env.STANDARDS_EMBED_CHAR_BUDGET ?? 4500
);

export interface ChunkedDocument {
  documentId: string | null;
  chunks: DraftChunk[];
  pages: {
    pageNumber: number;
    extractionStatus: ExtractionStatus;
    visualOnlyReason: VisualOnlyReason | null;
    headingSource: HeadingSource;
    proseText: string;
    ocrText: string;
    imagePath: string | null;
  }[];
  stats: {
    pages: number;
    prose: number;
    tableParents: number;
    rowGroupChildren: number;
    visualOnly: number;
  };
}

/** Read a manifest directory and chunk the whole document. */
export function chunkDocument(
  manifestDir: string,
  opts: ChunkingOptions = {}
): ChunkedDocument {
  const files = fs
    .readdirSync(manifestDir)
    .filter((f) => /^page_\d+\.json$/.test(f))
    .sort();
  if (files.length === 0) {
    throw new Error(`no page manifests found in ${manifestDir}`);
  }

  const chunks: DraftChunk[] = [];
  const pages: ChunkedDocument["pages"] = [];
  let documentId: string | null = null;

  for (const f of files) {
    const m: PageManifest = JSON.parse(
      fs.readFileSync(path.join(manifestDir, f), "utf8")
    );
    documentId = documentId ?? m.documentId;

    if (m.extractionStatus === "VISUAL_ONLY") {
      // ONE chunk, not two. An earlier version also emitted a PROSE chunk here,
      // but the VISUAL chunk is a strict superset of it: both carry
      // proseText + ocrText, and VISUAL additionally prefixes the heading.
      // Measured — Expansion_Anchor p15: byte-identical (no heading);
      // ccd p6/p20/p50: VISUAL endsWith(PROSE) with only "2X\n\n" etc. extra,
      // and PROSE carried nothing VISUAL lacked on any page. So the PROSE row
      // was pure duplication: a second embedding of the same text, and a second
      // citable row for one page.
      //
      // VISUAL is the row to keep: it is what the retrieval design names for
      // the locating branch, and chatService keys its OCR-noise hedging off
      // chunk_type = VISUAL.
      chunks.push(visualOnlyTableChunk(m, opts));
    } else {
      chunks.push(...chunkPage(m, opts));
    }

    pages.push({
      pageNumber: m.pageNumber,
      extractionStatus: m.extractionStatus,
      visualOnlyReason: m.visualOnlyReason,
      headingSource: headingSourceOf(m),
      proseText: m.proseText,
      ocrText: m.ocrText,
      imagePath: m.imagePath ?? null,
    });
  }

  return {
    documentId,
    chunks,
    pages,
    stats: {
      pages: pages.length,
      prose: chunks.filter((c) => c.chunkType === "PROSE").length,
      tableParents: chunks.filter(
        (c) => c.chunkType === "TABLE" && c.parentLocalId === null
      ).length,
      rowGroupChildren: chunks.filter((c) => c.parentLocalId !== null).length,
      visualOnly: chunks.filter((c) => c.chunkType === "VISUAL").length,
    },
  };
}
