/**
 * (b) Before/after true within-branch rank for Q9/10/11/14/20, comparing
 * dense-only (old tableBranch formula) vs dense+BM25 RRF (new). No pipeline
 * changes here -- this replicates both formulas directly against the DB to
 * isolate the effect of adding lexical scoring.
 */
import prisma from "../src/config/database/client";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const AISC = "c98019bf-dfbb-460f-971a-f003a0c53077";

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }) });
  return ((await res.json()) as any).embedding;
}

async function trueRankDenseOnly(doc: string, targetParentId: string, qv: number[]) {
  const vecStr = `[${qv.join(",")}]`;
  const rows: any[] = await prisma.$queryRawUnsafe(`
    WITH child_scores AS (
      SELECT c.parent_chunk_id AS parent_id, 1 - (c.embedding <=> $1::vector) AS score
      FROM standard_chunks c WHERE c.chunk_type='TABLE' AND c.parent_chunk_id IS NOT NULL AND c.document_id=$2::uuid
    ), pooled AS (SELECT parent_id, MAX(score) AS score FROM child_scores GROUP BY parent_id),
    ranked AS (SELECT parent_id, score, ROW_NUMBER() OVER (ORDER BY score DESC) rn FROM pooled)
    SELECT rn, score FROM ranked WHERE parent_id = $3::uuid
  `, vecStr, doc, targetParentId);
  const [{n}]: any = await prisma.$queryRawUnsafe(`
    SELECT count(DISTINCT parent_chunk_id) n FROM standard_chunks WHERE chunk_type='TABLE' AND parent_chunk_id IS NOT NULL AND document_id=$1::uuid
  `, doc);
  return rows.length ? { rank: Number(rows[0].rn), total: Number(n), score: Number(rows[0].score) } : { rank: null, total: Number(n) };
}

/** Read-only simulation of the corpus AFTER re-ingestion with the ×->x fix
 *  applied at storage time (manifestChunking.ts). No writes to standard_chunks
 *  -- the actual stored text is untouched; replace() here stands in for what
 *  ingestion would have produced, mirroring retrievalTwoBranch.ts's query-side
 *  normalizeMultiplicationSignForQuery applied to qText. */
async function trueRankDenseBM25(doc: string, targetParentId: string, qv: number[], qText: string) {
  const vecStr = `[${qv.join(",")}]`;
  const normalizedQ = qText.replace(/×/g, "x");
  const rows: any[] = await prisma.$queryRawUnsafe(`
    WITH child_scores AS (
      SELECT c.parent_chunk_id AS parent_id,
             1 - (c.embedding <=> $1::vector) AS dense_score,
             ts_rank(to_tsvector('english', replace(c.text_content, '×', 'x')), plainto_tsquery('english', $2)) AS bm25_score
      FROM standard_chunks c WHERE c.chunk_type='TABLE' AND c.parent_chunk_id IS NOT NULL AND c.document_id=$3::uuid
    ),
    pooled AS (SELECT parent_id, MAX(dense_score) dense_score, MAX(bm25_score) bm25_score FROM child_scores GROUP BY parent_id),
    dense_ranked AS (SELECT parent_id, ROW_NUMBER() OVER (ORDER BY dense_score DESC) rnk FROM pooled),
    bm25_ranked AS (SELECT parent_id, ROW_NUMBER() OVER (ORDER BY bm25_score DESC, dense_score DESC) rnk FROM pooled WHERE bm25_score > 0),
    fused AS (SELECT p.parent_id, p.dense_score, p.bm25_score,
                     (1.0/(60+dr.rnk)) + COALESCE(1.0/(60+br.rnk),0) rrf_score
              FROM pooled p JOIN dense_ranked dr ON dr.parent_id=p.parent_id
              LEFT JOIN bm25_ranked br ON br.parent_id=p.parent_id),
    ranked AS (SELECT parent_id, dense_score, bm25_score, rrf_score, ROW_NUMBER() OVER (ORDER BY rrf_score DESC) rn FROM fused)
    SELECT rn, dense_score, bm25_score, rrf_score FROM ranked WHERE parent_id = $4::uuid
  `, vecStr, normalizedQ, doc, targetParentId);
  const [{n}]: any = await prisma.$queryRawUnsafe(`
    SELECT count(DISTINCT parent_chunk_id) n FROM standard_chunks WHERE chunk_type='TABLE' AND parent_chunk_id IS NOT NULL AND document_id=$1::uuid
  `, doc);
  return rows.length
    ? { rank: Number(rows[0].rn), total: Number(n), denseScore: Number(rows[0].dense_score), bm25Score: Number(rows[0].bm25_score) }
    : { rank: null, total: Number(n) };
}

const targets: {q:number, label:string, q_text:string, parentId:string}[] = [
  {q:9,  label:"W24x370 (flange thickness)", q_text:"What is the flange thickness of a W24x370?", parentId:"271e4ebc-50a5-48e9-81fa-c9b4406152f6"},
  {q:20, label:"W24x370 (depth/flange/thickness)", q_text:"What are the depth, flange width, and flange thickness of a W24x370?", parentId:"271e4ebc-50a5-48e9-81fa-c9b4406152f6"},
  {q:10, label:"W44x335 (area)", q_text:"What is the area of a W44x335?", parentId:"6e3bf191-1f62-428e-8fcc-0ee1f9942136"},
  {q:11, label:"W12x65 (flexural strength)", q_text:"What is the design flexural strength of a W12x65?", parentId:"e2a5c891-67bb-43c7-993f-ed0e06f1f951"},
  {q:14, label:"1/2 bolt dia hole size (shear plate, rephrased)", q_text:"1/2 bolt dia hole size in shear plate", parentId:"7b15f50c-eff6-480e-a0f2-a71ed3255c39"},
];

async function main() {
  console.log(`${"Q".padEnd(3)} ${"label".padEnd(40)} ${"dense-only rank".padEnd(18)} ${"dense+BM25 rank".padEnd(18)} bm25_score`);
  for (const t of targets) {
    const qv = await embed(t.q_text);
    const before = await trueRankDenseOnly(AISC, t.parentId, qv);
    const after = await trueRankDenseBM25(AISC, t.parentId, qv, t.q_text);
    console.log(`${String(t.q).padEnd(3)} ${t.label.padEnd(40)} ${`${before.rank}/${before.total}`.padEnd(18)} ${`${after.rank}/${after.total}`.padEnd(18)} bm25=${(after as any).bm25Score}`);
  }
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
