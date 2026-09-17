import prisma from "../src/config/database/client";
const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const AISC = "c98019bf-dfbb-460f-971a-f003a0c53077";
async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }) });
  return ((await res.json()) as any).embedding;
}
async function trueRankOR(doc: string, targetParentId: string, qv: number[], qText: string) {
  const vecStr = `[${qv.join(",")}]`;
  const normalizedQ = qText.replace(/×/g, "x");
  const rows: any[] = await prisma.$queryRawUnsafe(`
    WITH child_scores AS (
      SELECT c.parent_chunk_id AS parent_id,
             1 - (c.embedding <=> $1::vector) AS dense_score,
             ts_rank(to_tsvector('english', replace(c.text_content, '×', 'x')),
                     to_tsquery('english', replace(plainto_tsquery('english', $2)::text, ' & ', ' | '))) AS bm25_score
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
    ? { rank: Number(rows[0].rn), total: Number(n), bm25Score: Number(rows[0].bm25_score) }
    : { rank: null, total: Number(n), bm25Score: null };
}
const targets = [
  {q:9,  label:"W24x370 flange thickness", q_text:"What is the flange thickness of a W24x370?", parentId:"271e4ebc-50a5-48e9-81fa-c9b4406152f6", prevAND:25},
  {q:10, label:"W44x335 area",             q_text:"What is the area of a W44x335?", parentId:"6e3bf191-1f62-428e-8fcc-0ee1f9942136", prevAND:34},
  {q:11, label:"W12x65 flexural strength", q_text:"What is the design flexural strength of a W12x65?", parentId:"e2a5c891-67bb-43c7-993f-ed0e06f1f951", prevAND:743},
];
async function main() {
  console.log(`${"Q".padEnd(3)} ${"label".padEnd(28)} ${"prev(AND)".padEnd(12)} ${"now(OR)".padEnd(12)} bm25_score`);
  for (const t of targets) {
    const qv = await embed(t.q_text);
    const r = await trueRankOR(AISC, t.parentId, qv, t.q_text);
    console.log(`${String(t.q).padEnd(3)} ${t.label.padEnd(28)} ${`${t.prevAND}/1330`.padEnd(12)} ${`${r.rank}/${r.total}`.padEnd(12)} bm25=${r.bm25Score}`);
  }
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
