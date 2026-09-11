/**
 * Phase 4 step 1 -- two-branch retrieval, no reranker, no query rewrite.
 *
 * Table branch: score row-group children by cosine, GROUP BY parent, MAX,
 * return the parent. Prose branch: BM25 (Postgres native ts_rank, no new
 * dependency) + dense, fused by RRF. Both branches filter d.status='ACTIVE'
 * and are scoped per document, then merged and deduplicated by chunk id.
 *
 * This module is for isolated measurement against the eval set -- it is not
 * wired into chatService/retrievalService yet. Read-only: no writes to
 * standard_chunks or standard_pages.
 */
import prisma from "../../../config/database/client";

const RRF_K = 60;

export interface RetrievedChunk {
  id: string;
  documentId: string;
  pdfName: string;
  sourceType: string;
  chunkType: string;
  pageStart: number;
  pageEnd: number;
  textContent: string;
  heading: string | null;
  /** Phase 2 amendment 11. Set only on some PROSE chunks. Always null on a
   *  TABLE chunk (parent or child) by construction -- see
   *  manifestChunking.ts's ChunkReliabilityReason. Phase 5 §2 checks this,
   *  independent of chunkType, before trusting a chunk as citable. */
  reliabilityReason: string | null;
  score: number;
  branch: "table" | "prose";
}

// Phase 5 §1.3: project-scoping lives in retrievalService.ts's
// resolveProjectDocumentIds(), the canonical implementation (a direct port of
// the tested searchScope() logic). A second, divergent copy briefly existed
// here (it matched documents by family alone, without checking source_type,
// and still union'd in a PROJECT tier the client pivot removed) -- deleted,
// unused anywhere else, confirmed by grep before removal.

function vectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/** Same normalization applied to stored table cell text (manifestChunking.ts's
 *  flattenCell/serializeGrid) -- U+00D7 "×" to ASCII "x" -- applied to the
 *  query text before it reaches plainto_tsquery, so "W44x335" tokenizes
 *  identically on both sides instead of splitting the stored "W44×335" into
 *  separate 'w44'/'335' lexemes that a single 'w44x335' query token can't match. */
function normalizeMultiplicationSignForQuery(text: string): string {
  return text.replace(/×/g, "x");
}

/**
 * Table branch. Filter matches the spec exactly:
 *   chunk_type = 'TABLE' AND parent_chunk_id IS NOT NULL AND d.status = 'ACTIVE'
 * i.e. score the CHILDREN, group by parent, return the PARENT -- never a child.
 *
 * Diagnosis (Q9/Q10/Q11 severe burial): this branch had NO lexical component
 * at all -- dense cosine only. Exact alphanumeric identifiers ("W44x335",
 * "W12x65") exist verbatim in the row-group child text but dense embeddings
 * cluster near-identical shape rows tightly together, so identifier lookups
 * were entirely dependent on embedding separation that doesn't reliably
 * exist. Fixed by adding BM25 (ts_rank) over the same children, max-pooled to
 * the parent exactly like dense score already is, fused by RRF (same k=60,
 * same pattern as proseBranch) to decide which topKPerDoc parents survive per
 * document. As in proseBranch's fix, the value exposed on `.score` is the raw
 * (max-pooled) dense cosine, not the RRF-fused value -- the outer
 * cross-document normalization boundary needs real magnitude, not an ordinal
 * fusion rank; BM25 only affects per-document SELECTION.
 *
 * BM25 query is OR-combined (to_tsquery with '|'), not AND (plainto_tsquery's
 * default) -- table cell content is terse and symbolic (column headers like
 * "M px /Ω b", not English words), so a natural-language question's generic
 * words ("design", "flexural", "strength") routinely don't appear anywhere in
 * the row text even when the identifier term does. AND semantics collapse
 * ts_rank toward zero whenever any conjunct is absent, burying an exact
 * identifier match under words the table was never going to contain (found on
 * Q11: 'w12x65' matched with ts_rank=0.061 alone, but ~0 once ANDed with
 * 'design'&'flexur'&'strength', none of which exist in that row). OR fixes
 * this because a match on the identifier alone still scores. Built by taking
 * plainto_tsquery's own tokenized/stemmed output and swapping '&' for '|' --
 * reuses its tokenization and stemming rather than reimplementing it, and
 * needs no raw user text to reach to_tsquery. proseBranch stays on AND:
 * natural-language prose is where requiring all query words genuinely helps.
 */
export async function tableBranch(
  queryVec: number[],
  queryText: string,
  documentIds: string[],
  topKPerDoc: number = 5
): Promise<RetrievedChunk[]> {
  // Phase 5 §1.3: this is the cross-project data-isolation boundary. An empty
  // scope means the project has no associated documents at all (no GENERAL/
  // PROJECT preferences, no FABRICATOR document) -- short-circuit before
  // querying, both to match the old per-tier "0 preferences -> 0 results"
  // behavior and to avoid a wasted round trip (an empty ANY() array would
  // correctly match zero rows anyway, but there is no reason to ask Postgres).
  if (documentIds.length === 0) return [];

  const vectorString = vectorLiteral(queryVec);
  const bm25QueryText = normalizeMultiplicationSignForQuery(queryText);
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    WITH child_scores AS (
      SELECT c.parent_chunk_id AS parent_id,
             c.document_id,
             1 - (c.embedding <=> $1::vector) AS dense_score,
             ts_rank(to_tsvector('english', c.text_content),
                     to_tsquery('english', replace(plainto_tsquery('english', $2)::text, ' & ', ' | '))) AS bm25_score
      FROM standard_chunks c
      JOIN standard_documents d ON d.id = c.document_id
      WHERE c.chunk_type = 'TABLE'
        AND c.parent_chunk_id IS NOT NULL
        AND d.status = 'ACTIVE'
        AND c.document_id = ANY($5::uuid[])
    ),
    pooled AS (
      SELECT parent_id, document_id,
             MAX(dense_score) AS dense_score,
             MAX(bm25_score) AS bm25_score
      FROM child_scores
      GROUP BY parent_id, document_id
    ),
    dense_ranked AS (
      SELECT parent_id, document_id,
             ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY dense_score DESC) AS rnk
      FROM pooled
    ),
    bm25_ranked AS (
      SELECT parent_id, document_id,
             ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY bm25_score DESC, dense_score DESC) AS rnk
      FROM pooled
      WHERE bm25_score > 0
    ),
    fused AS (
      SELECT p.parent_id, p.document_id, p.dense_score,
             (1.0 / ($3 + dr.rnk)) + COALESCE(1.0 / ($3 + br.rnk), 0) AS rrf_score
      FROM pooled p
      JOIN dense_ranked dr ON dr.parent_id = p.parent_id AND dr.document_id = p.document_id
      LEFT JOIN bm25_ranked br ON br.parent_id = p.parent_id AND br.document_id = p.document_id
    ),
    ranked AS (
      SELECT parent_id, document_id, dense_score, rrf_score,
             ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY rrf_score DESC) AS rn
      FROM fused
    )
    SELECT p.id, p.document_id AS "documentId", d.pdf_name AS "pdfName",
           d.source_type AS "sourceType",
           p.chunk_type AS "chunkType", p.page_start AS "pageStart",
           p.page_end AS "pageEnd", p.text_content AS "textContent",
           p.heading, p.reliability_reason AS "reliabilityReason",
           r.dense_score AS score
    FROM ranked r
    JOIN standard_chunks p ON p.id = r.parent_id
    JOIN standard_documents d ON d.id = r.document_id
    WHERE r.rn <= $4
    ORDER BY r.document_id, r.dense_score DESC
    `,
    vectorString,
    bm25QueryText,
    RRF_K,
    topKPerDoc,
    documentIds
  );
  return rows.map((r) => ({ ...r, score: Number(r.score), branch: "table" as const }));
}

/**
 * Prose branch. Filter matches the spec exactly:
 *   parent_chunk_id IS NULL AND chunk_type IN ('PROSE','VISUAL') AND d.status='ACTIVE'
 * BM25 via native ts_rank (plainto_tsquery, no new dependency); dense via
 * cosine; fused by RRF, k=60, for SELECTION only (which topKPerDoc candidates
 * survive per document -- a legitimate lexical+dense blend for that purpose).
 *
 * The value returned on `.score` is NOT the RRF-fused value -- it is the raw
 * dense cosine. Found by diagnosis: combineDocumentResultsNormalized's outer
 * min-max boundary needs real magnitude to stay comparable across documents,
 * same as the table branch's raw cosine. RRF's 1/(k+rank) with k=60 flattens
 * every document's kept candidates into a ~0.007-wide band regardless of
 * actual relevance (rank 1..15 -> ~0.0328..0.0133), so normalizing THAT
 * value re-imports the exact ordinality the outer boundary was redesigned to
 * avoid -- confirmed directly on Q2 (AISC): within-doc rank 10/15, RRF score
 * 0.027032, normalized against the global RRF-value range to 0.234, landing
 * at pool rank 76/103 despite being a genuinely strong dense match. Exposing
 * raw dense cosine instead restores a scale comparable to the table branch's.
 */
export async function proseBranch(
  queryText: string,
  queryVec: number[],
  documentIds: string[],
  topKPerDoc: number = 5
): Promise<RetrievedChunk[]> {
  // Phase 5 §1.3 -- see tableBranch's identical guard/comment.
  if (documentIds.length === 0) return [];

  const vectorString = vectorLiteral(queryVec);
  const bm25QueryText = normalizeMultiplicationSignForQuery(queryText);
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    WITH base AS (
      SELECT c.id, c.document_id, c.chunk_type, c.page_start, c.page_end, c.text_content, c.heading,
             c.reliability_reason,
             1 - (c.embedding <=> $1::vector) AS dense_score,
             ts_rank(to_tsvector('english', c.text_content),
                     plainto_tsquery('english', $2)) AS bm25_score
      FROM standard_chunks c
      JOIN standard_documents d ON d.id = c.document_id
      WHERE c.parent_chunk_id IS NULL
        AND c.chunk_type IN ('PROSE','VISUAL')
        AND d.status = 'ACTIVE'
        AND c.embedding IS NOT NULL
        AND c.document_id = ANY($5::uuid[])
    ),
    dense_ranked AS (
      SELECT id, document_id, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY dense_score DESC) AS rnk
      FROM base
    ),
    bm25_ranked AS (
      SELECT id, document_id, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY bm25_score DESC, dense_score DESC) AS rnk
      FROM base
      WHERE bm25_score > 0
    ),
    fused AS (
      SELECT b.id, b.document_id,
             (1.0 / ($3 + dr.rnk)) + COALESCE(1.0 / ($3 + br.rnk), 0) AS rrf_score
      FROM base b
      JOIN dense_ranked dr ON dr.id = b.id
      LEFT JOIN bm25_ranked br ON br.id = b.id
    ),
    ranked AS (
      SELECT id, document_id, rrf_score,
             ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY rrf_score DESC) AS rn
      FROM fused
    )
    SELECT b.id, b.document_id AS "documentId", d.pdf_name AS "pdfName",
           d.source_type AS "sourceType",
           b.chunk_type AS "chunkType", b.page_start AS "pageStart",
           b.page_end AS "pageEnd", b.text_content AS "textContent", b.heading,
           b.reliability_reason AS "reliabilityReason",
           b.dense_score AS score
    FROM ranked r
    JOIN base b ON b.id = r.id
    JOIN standard_documents d ON d.id = r.document_id
    WHERE r.rn <= $4
    ORDER BY r.document_id, r.rrf_score DESC
    `,
    vectorString,
    bm25QueryText,
    RRF_K,
    topKPerDoc,
    documentIds
  );
  return rows.map((r) => ({ ...r, score: Number(r.score), branch: "prose" as const }));
}

/** Merge both branches, dedup by chunk id (a chunk cannot appear in both
 *  branches by construction -- different chunk_type/parent_chunk_id
 *  predicates -- but dedup defensively). Does NOT sort by a comparable
 *  score -- see mergeBranchesRRF for the fusion that actually is comparable. */
export function mergeBranches(
  table: RetrievedChunk[],
  prose: RetrievedChunk[]
): RetrievedChunk[] {
  const seen = new Set<string>();
  const out: RetrievedChunk[] = [];
  for (const c of [...table, ...prose]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

/**
 * Bug 1 fix: rank-based fusion across BOTH branches, not a raw-score merge.
 *
 * The table branch's raw cosine (0.5-0.73 typical) and the prose branch's RRF
 * score (capped near 1/61+1/61 = 0.033 for a two-list fusion) are not on
 * comparable scales -- sorting the merge on either score directly meant the
 * prose branch could never outrank the table branch regardless of relevance.
 * No normalization heuristic: the fix is the same RRF formula used one level
 * higher. Each branch's combined (across-document) candidate set is ranked by
 * its own score, then those two rank lists are fused exactly like the prose
 * branch's dense+BM25 fusion: score = 1/(k+rank). A chunk appears in at most
 * one branch's candidate list by construction (chunk_type/parent_chunk_id
 * predicates are disjoint), so this reduces to re-ranking every candidate by
 * 1/(k+its own within-branch global rank) -- but expressed as an explicit
 * fusion, not a special case, so a chunk that ever appears in both stays correct.
 */
export function mergeBranchesRRF(
  table: RetrievedChunk[],
  prose: RetrievedChunk[],
  k: number = RRF_K
): RetrievedChunk[] {
  const tableRanked = [...table].sort((a, b) => b.score - a.score);
  const proseRanked = [...prose].sort((a, b) => b.score - a.score);

  const fused = new Map<string, { chunk: RetrievedChunk; score: number }>();
  const add = (list: RetrievedChunk[]) => {
    list.forEach((c, i) => {
      const rank = i + 1;
      const contribution = 1 / (k + rank);
      const cur = fused.get(c.id);
      if (cur) cur.score += contribution;
      else fused.set(c.id, { chunk: c, score: contribution });
    });
  };
  add(tableRanked);
  add(proseRanked);

  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .map((x) => ({ ...x.chunk, score: x.score }));
}

function groupByDocument(chunks: RetrievedChunk[]): Map<string, RetrievedChunk[]> {
  const m = new Map<string, RetrievedChunk[]>();
  for (const c of chunks) {
    const arr = m.get(c.documentId) ?? [];
    arr.push(c);
    m.set(c.documentId, arr);
  }
  return m;
}

/**
 * Combine results across documents at the outer boundary -- NO RRF here.
 *
 * History: a second RRF boundary here collapsed the gate to 3/22, because RRF
 * is ordinal by construction -- a document's own rank-1 candidate always
 * scores exactly 1/(k+1), REGARDLESS of whether the underlying match was a
 * 0.73 cosine (AISC, genuinely strong) or a 0.53 cosine (a different document,
 * genuinely weak). The inner table-vs-prose fusion is correct to be
 * rank-based (table cosine and prose RRF-of-dense+BM25 are not otherwise
 * comparable), but that same ordinality, applied a second time across
 * documents, throws away exactly the magnitude information this boundary
 * needs. Confirmed directly, not inferred: after the inner fusion, all four
 * documents' best candidates measured 0.016393 -- identical -- despite raw
 * cosine scores of 0.73 / 0.54 / 0.53 / 0.03 underneath them.
 *
 * Fix: use the underlying RAW score (table branch cosine, or prose branch's
 * own raw dense cosine -- whichever produced that candidate), min-max
 * normalized to [0,1] PER BRANCH across the full candidate pool, so the two
 * branches' different native scales become comparable without discarding
 * magnitude. Sort directly on the normalized value -- no rank-only step here.
 *
 * Correction: this originally used the prose branch's dense+BM25 RRF-fused
 * value here, not raw dense cosine -- an ordinal value from the INNER
 * boundary's fusion, which reintroduced the same flattening this fix exists
 * to avoid, one layer down (see proseBranch's docstring). Fixed by exposing
 * raw dense cosine from proseBranch instead; the inner RRF fusion still
 * decides which topKPerDoc candidates survive per document.
 */
function minMax(scores: number[]): { min: number; max: number } {
  if (!scores.length) return { min: 0, max: 1 };
  return { min: Math.min(...scores), max: Math.max(...scores) };
}

function normalize(score: number, range: { min: number; max: number }): number {
  const span = range.max - range.min;
  return span > 0 ? (score - range.min) / span : 0.5;
}

export function combineDocumentResultsNormalized(
  table: RetrievedChunk[],
  prose: RetrievedChunk[]
): RetrievedChunk[] {
  const tableRange = minMax(table.map((c) => c.score));
  const proseRange = minMax(prose.map((c) => c.score));

  const normalized = [
    ...table.map((c) => ({ ...c, score: normalize(c.score, tableRange) })),
    ...prose.map((c) => ({ ...c, score: normalize(c.score, proseRange) })),
  ];
  return normalized.sort((a, b) => b.score - a.score);
}

/**
 * Full pipeline. Two boundaries, two different fusion rules -- deliberately:
 *   inner (table-vs-prose, within one document): RRF. Correct there -- the two
 *     branches' scores are not otherwise comparable, and there is real rank
 *     spread (5+ candidates per branch) for RRF to carry signal over.
 *   outer (across documents): NOT RRF. Only 4 documents means no rank spread
 *     to fuse over, and RRF's ordinality would discard exactly the magnitude
 *     this boundary needs (see combineDocumentResultsNormalized). Per-branch
 *     min-max normalized raw score, sorted directly.
 *
 * perDocumentOrder (the inner RRF fusion) is computed and returned for
 * inspection/future use (e.g. ordering multiple candidates drawn from one
 * winning document) but does NOT feed the cross-document ranking below.
 */
export async function retrieveTwoBranch(
  queryText: string,
  queryVec: number[],
  documentIds: string[],
  topKPerDoc: number = 5
): Promise<RetrievedChunk[]> {
  const [table, prose] = await Promise.all([
    tableBranch(queryVec, queryText, documentIds, topKPerDoc),
    proseBranch(queryText, queryVec, documentIds, topKPerDoc),
  ]);
  return combineDocumentResultsNormalized(table, prose);
}

/** Inner-fusion view, per document -- kept available, not used for the
 *  cross-document ranking above. See retrieveTwoBranch's docstring. */
export async function retrieveTwoBranchPerDocumentOrder(
  queryText: string,
  queryVec: number[],
  documentIds: string[],
  topKPerDoc: number = 5
): Promise<Map<string, RetrievedChunk[]>> {
  const [table, prose] = await Promise.all([
    tableBranch(queryVec, queryText, documentIds, topKPerDoc),
    proseBranch(queryText, queryVec, documentIds, topKPerDoc),
  ]);
  const tableByDoc = groupByDocument(table);
  const proseByDoc = groupByDocument(prose);
  const docIds = new Set([...tableByDoc.keys(), ...proseByDoc.keys()]);
  const out = new Map<string, RetrievedChunk[]>();
  for (const docId of docIds) {
    out.set(docId, mergeBranchesRRF(tableByDoc.get(docId) ?? [], proseByDoc.get(docId) ?? []));
  }
  return out;
}
