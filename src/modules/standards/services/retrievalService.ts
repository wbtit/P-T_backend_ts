import prisma from "../../../config/database/client";

export interface SearchStandardsOptions {
  query: string;
  projectId: string;
  threshold?: number; // candidate floor (default 0.45)
  alpha?: number;
  acceptanceThreshold?: number; // final threshold (default 0.60)
  /** How many pooled candidates to return (default 10).
   *  Widened to feed the cross-encoder reranker — see rerankerService.ts. */
  topK?: number;
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  chunkType: string;
  pageStart: number;
  pageEnd: number;
  textContent: string;
  sourceType: string;
  similarity: number; // Final score
  vectorSimilarity: number;
  lexicalScore: number;
  isAnchor?: boolean;
  /** Anchor chunk expanded from this hit. Undefined for anchor rows themselves.
   *  No longer populated -- the heading-based lookup this depended on was removed along with
   *  the stale-heading heuristic (see chunking.ts). A PDF-outline-based detector may repopulate
   *  this mechanism in a later phase; the plumbing (here, and in citation building) is left in
   *  place for that, but nothing sets it today. */
  anchor?: RetrievedChunk;
  parentPageId?: string;
  heading?: string;
}

import { standardAbbreviations } from "../../../utils/abbreviations";

const STOPWORDS = new Set([
  "what", "is", "the", "of", "are", "should", "i", "use", "for", "how", "do", "a", "an", "to", "in", "on", "at", "by", "and", "or"
]);

function tokenizeAndNormalize(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const rawTokens = lower.match(/[a-z0-9\/]+/g) || [];
  const tokens: string[] = [];
  for (const t of rawTokens) {
    if (STOPWORDS.has(t)) continue;
    const expanded = Object.prototype.hasOwnProperty.call(standardAbbreviations, t) ? standardAbbreviations[t] : t;
    if (expanded.includes(" ")) {
      tokens.push(...expanded.split(" "));
    } else {
      tokens.push(expanded);
    }
  }
  return tokens;
}

function calculateLexicalScore(queryTokens: string[], chunkText: string): number {
  if (queryTokens.length === 0) return 0;
  const chunkTokens = new Set(tokenizeAndNormalize(chunkText));
  let overlap = 0;
  for (const qt of queryTokens) {
    if (chunkTokens.has(qt)) overlap++;
  }
  return overlap / queryTokens.length;
}

const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

export async function generateEmbedding(text: string): Promise<number[]> {
  // NOTE: Ollama's /api/embeddings ignores the num_ctx option for nomic-embed-text. The model remains strictly capped at 2048 tokens.
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text })
  });
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }
  const data = (await response.json()) as { embedding: number[] };
  if (!data.embedding || data.embedding.length === 0) {
    throw new Error(`Empty embedding received from Ollama API`);
  }
  return data.embedding;
}

/**
 * Single document-level candidate pool: every ACTIVE document a project can see --
 * GENERAL documents (visible to all projects), the project's fabricator's FABRICATOR
 * documents (if it has a fabricator), and the project's own PROJECT documents. No opt-in
 * selection, no per-tier short-circuiting, no separate result buckets -- see
 * tests/KNOWN_ISSUES.md ("3-tier hard-selection model removed, Phase 0 teardown").
 */
export async function searchStandards(options: SearchStandardsOptions): Promise<RetrievedChunk[]> {
  const { query, projectId, threshold = 0.45, alpha = 0.0, acceptanceThreshold = 0.60, topK = 10 } = options;
  if (!projectId) return [];

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { fabricatorID: true }
  });

  const embedding = await generateEmbedding(query);
  const vectorString = `[${embedding.join(",")}]`;
  const queryTokens = tokenizeAndNormalize(query);

  const visibilityClauses = [`d.source_type = 'GENERAL'`];
  const params: any[] = [vectorString, threshold];
  if (project?.fabricatorID) {
    params.push(project.fabricatorID);
    visibilityClauses.push(`(d.source_type = 'FABRICATOR' AND d.fabricator_id = $${params.length}::uuid)`);
  }
  params.push(projectId);
  visibilityClauses.push(`(d.source_type = 'PROJECT' AND d.project_id = $${params.length}::uuid)`);

  const querySql = `
    SELECT
      c.id,
      c.document_id as "documentId",
      c.chunk_type as "chunkType",
      c.page_start as "pageStart",
      c.page_end as "pageEnd",
      c.text_content as "textContent",
      c.source_type as "sourceType",
      c.heading,
      c.parent_page_id as "parentPageId",
      1 - (c.embedding <=> $1::vector) AS similarity
    FROM standard_chunks c
    JOIN standard_documents d ON c.document_id = d.id
    WHERE d.status = 'ACTIVE' AND (${visibilityClauses.join(" OR ")})
      AND 1 - (c.embedding <=> $1::vector) > $2
    ORDER BY c.embedding <=> $1::vector
    LIMIT 40
  `;

  const results: any[] = await prisma.$queryRawUnsafe(querySql, ...params);

  const allHits: RetrievedChunk[] = results.map(row => {
    const lexicalScore = calculateLexicalScore(queryTokens, row.textContent);
    const finalScore = row.similarity + (alpha * lexicalScore);
    return {
      id: row.id,
      documentId: row.documentId,
      chunkType: row.chunkType,
      pageStart: row.pageStart,
      pageEnd: row.pageEnd,
      textContent: row.textContent,
      sourceType: row.sourceType,
      vectorSimilarity: row.similarity,
      lexicalScore,
      similarity: finalScore,
      parentPageId: row.parentPageId,
      heading: row.heading
    };
  });

  // Max-pool finalScore by parentPageId
  const pooledMap = new Map<string, RetrievedChunk>();
  for (const hit of allHits) {
    const groupKey = hit.parentPageId || hit.id;
    const existing = pooledMap.get(groupKey);
    if (!existing || hit.similarity > existing.similarity) {
      pooledMap.set(groupKey, hit);
    }
  }

  const directHits = [...pooledMap.values()]
    .filter(chunk => chunk.similarity > acceptanceThreshold)
    .sort((a, b) => b.similarity - a.similarity);

  return directHits.slice(0, topK);
}
