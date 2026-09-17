/**
 * (b) Q10/Q11 severe burial -- diagnose lexical (BM25) branch specifically.
 * Does BM25 find the exact identifier at all (hit-but-lost-in-fusion), or
 * does it also miss (branch miss, different bug)? No pipeline changes.
 */
import prisma from "../src/config/database/client";

const AISC = "c98019bf-dfbb-460f-971a-f003a0c53077";

async function bm25Rank(label: string, targetId: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    WITH base AS (
      SELECT c.id, c.page_start,
             ts_rank(to_tsvector('english', c.text_content), plainto_tsquery('english', $1)) AS bm25_score
      FROM standard_chunks c
      WHERE c.parent_chunk_id IS NULL AND c.chunk_type IN ('PROSE','VISUAL')
        AND c.document_id = $2::uuid AND c.embedding IS NOT NULL
    ),
    ranked AS (SELECT id, page_start, bm25_score, ROW_NUMBER() OVER (ORDER BY bm25_score DESC) rn FROM base WHERE bm25_score > 0)
    SELECT id, page_start, bm25_score, rn FROM ranked WHERE id = $3::uuid
  `, label, AISC, targetId);
  const [{n}]: any = await prisma.$queryRawUnsafe(`
    SELECT count(*) n FROM standard_chunks c
    WHERE c.parent_chunk_id IS NULL AND c.chunk_type IN ('PROSE','VISUAL')
      AND c.document_id=$2::uuid AND c.embedding IS NOT NULL
      AND ts_rank(to_tsvector('english', c.text_content), plainto_tsquery('english', $1)) > 0
  `, label, AISC);

  if (rows.length === 0) {
    console.log(`"${label}" (target ${targetId.slice(0,8)}): BM25 score = 0 or NULL -- BRANCH MISS (lexical query matched nothing on this chunk)`);
  } else {
    console.log(`"${label}" (target ${targetId.slice(0,8)}): BM25 rank ${rows[0].rn} of ${n} chunks with any BM25 match (score=${Number(rows[0].bm25_score).toFixed(6)})`);
  }
}

// Q9/Q20 target is a TABLE chunk (parent), not prose -- BM25 branch doesn't apply to it the
// same way (lexical query here is scoped to the PROSE branch's tsvector index). Reported
// anyway against the table branch's row-group children for completeness.
async function bm25RankTableChildren(label: string, parentId: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT c.id, c.text_content
    FROM standard_chunks c WHERE c.parent_chunk_id = $1::uuid
  `, parentId);
  let found = false;
  for (const r of rows) {
    if ((r.text_content as string).toUpperCase().includes(label.toUpperCase())) {
      found = true;
      console.log(`  label "${label}" found verbatim in child ${r.id}`);
    }
  }
  if (!found) console.log(`  label "${label}" NOT found verbatim in any child of parent ${parentId.slice(0,8)}`);
}

async function main() {
  console.log("=== Q10: W44x335 (prose kind per GT? -- actually TABLE kind; checking table branch child text) ===");
  await bm25RankTableChildren("W44×335", "6e3bf191-1f62-428e-8fcc-0ee1f9942136");
  console.log("\n=== Q11: W12x65 (TABLE kind; checking table branch child text) ===");
  await bm25RankTableChildren("W12×65", "e2a5c891-67bb-43c7-993f-ed0e06f1f951");
  console.log("\n=== Q9/Q20: W24x370 (TABLE kind; checking table branch child text) ===");
  await bm25RankTableChildren("W24×370", "271e4ebc-50a5-48e9-81fa-c9b4406152f6");
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
