/**
 * Full re-audit under corrected, chunk-ID-level ground truth. Frozen:
 * retrieval scoring (tableBranch/proseBranch/combineDocumentResultsNormalized),
 * K=15/doc, no chunking or schema change. Only the matching logic changes:
 * from page-range to exact chunk-id membership in a verified valid set,
 * scored by BEST rank among the valid set.
 */
import fs from "fs";
import prisma from "../src/config/database/client";
import { tableBranch, proseBranch, combineDocumentResultsNormalized, RetrievedChunk } from "../src/modules/standards/services/retrievalTwoBranch";
import { renderTableForRerank } from "./table-to-prose-check";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const TOPK = 15;
const AISC = "c98019bf-dfbb-460f-971a-f003a0c53077";
const SJI = "8fa1a87d-4da8-466b-a574-a358c3c03ba4";
const EA = "396840ef-34a2-487e-aaf0-61de4f82f983";
const CCD = "0c45d683-fd41-4806-b291-22ac65b8a626";

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  return ((await res.json()) as any).embedding;
}

// Verified, chunk-ID-level ground truth. Multiple ids = multiple valid chunks.
const GT: Record<number, { q: string; doc: string; ids: string[]; kind: "table" | "prose"; note?: string }> = {
  1:  { q: "What is the minimum size of fillet welds?", doc: AISC, kind: "table", ids: ["5980eb74-7daa-4d1d-a15e-af46bb60a292"] },
  2:  { q: "What are the requirements for slip-critical bolted connections?", doc: AISC, kind: "prose",
        ids: ["f6af27f4-3cba-439b-9320-5dbcf283e1b2", "004ea459-3a95-42e5-b5ba-9551b3a2a61a", "66936a75-36d0-4bbc-a24d-ea9ed9ee2a33"],
        note: "CORRECTED: 3 valid targets -- p896 (AISC commentary summary), p2113 (RCSC Spec Sec. 4.3, primary source), p1643 (AISC Spec Sec. J3.8, 'High-Strength Bolts in Slip-Critical Connections', primary source with the slip-resistance design formula). This is a ground-truth-completeness cluster, NOT same-topic crowding -- excluded from the crowding calibration set." },
  3:  { q: "What sequence should be followed when tightening shop bolts?", doc: AISC, kind: "prose",
        ids: ["a92ca6fc-ce06-497b-ae1e-1df981ac86e4", "60939148-48d8-40f1-9978-9134bf4d7354"],
        note: "CORRECTED: p2139 (Sec. 8.2.3, Twist-Off-Type Tension-Control Bolt Pretensioning) independently states the same 'progressing systematically from the most rigid part of the joint' sequence for a different bolt method -- added as a second valid target alongside p2138 (Sec. 8.2.2, Calibrated Wrench Pretensioning)" },
  4:  { q: "What is the definition of a compact section?", doc: AISC, kind: "prose",
        ids: ["1beb0000-0000-0000-0000-000000000000" /*placeholder, replaced below*/],
        note: "CORRECTED from p1785 (wrong -- HSS corrosion commentary) to p1505 Glossary + p1786 Comm.B4 (both contain the defining phrase)" },
  5:  { q: "What is the standard hole size for a 1/2 inch bolt?", doc: AISC, kind: "table", ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  6:  { q: "What is the standard hole size for a 3/4 inch bolt?", doc: AISC, kind: "table", ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"], note: "was wrongly matched to J3.3M (metric) in the previous audit" },
  7:  { q: "What washer size is needed for a 3/4 inch anchor rod?", doc: AISC, kind: "table", ids: ["5455661d-5c52-459a-be5e-c295efc81a49"] },
  8:  { q: "What is the maximum hole diameter for a 3/4 inch anchor rod in a base plate?", doc: AISC, kind: "table", ids: ["5455661d-5c52-459a-be5e-c295efc81a49"] },
  9:  { q: "What is the flange thickness of a W24x370?", doc: AISC, kind: "table", ids: ["271e4ebc-50a5-48e9-81fa-c9b4406152f6"] },
  10: { q: "What is the area of a W44x335?", doc: AISC, kind: "table", ids: ["6e3bf191-1f62-428e-8fcc-0ee1f9942136"] },
  11: { q: "What is the design flexural strength of a W12x65?", doc: AISC, kind: "table", ids: ["e2a5c891-67bb-43c7-993f-ed0e06f1f951"] },
  12: { q: "What is the seat depth for a K-series joist?", doc: SJI, kind: "prose", ids: ["caa7137a-db0f-41c1-a289-a5bb6ca933a5"] },
  14: { q: "1/2 bolt dia hole size in shear plate", doc: AISC, kind: "table", ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  15: { q: "washer size for 3/4 anchor rod", doc: AISC, kind: "table", ids: ["5455661d-5c52-459a-be5e-c295efc81a49"] },
  16: { q: "what is k series joist seat depth", doc: SJI, kind: "prose", ids: ["caa7137a-db0f-41c1-a289-a5bb6ca933a5"] },
  17: { q: "What is the standard hole size for a 5/8 inch bolt?", doc: AISC, kind: "table", ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  18: { q: "What is the standard hole size for a 7/8 inch bolt?", doc: AISC, kind: "table", ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  19: { q: "What is the standard hole size for a 1 inch bolt?", doc: AISC, kind: "table", ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  20: { q: "What are the depth, flange width, and flange thickness of a W24x370?", doc: AISC, kind: "table", ids: ["271e4ebc-50a5-48e9-81fa-c9b4406152f6"] },
  21: { q: "What nominal anchor diameters are covered for Kwik Bolt TZ expansion anchors?", doc: EA, kind: "table", ids: ["b2fab378-4188-4ce2-ac15-a66f9a0f2a2a"] },
  22: { q: "Show me connection detail 2X", doc: CCD, kind: "prose", ids: ["46983591-096f-4710-a62b-3d8dd75f2f20"] },
  23: { q: "What is the minimum bearing seat depth for a DLH-series joist, chord section 18 through 25?", doc: SJI, kind: "prose",
        ids: ["6be889ce-8b72-4f27-ac6d-1b104b0987e9", "c30f7e69-b542-46a9-8a8a-c7c58fdc3c87"],
        note: "GT was correct all along (p13 does contain 'A bearing seat depth of 7 1/2 inches (191 mm) has been established for the DLH Series chord section number 18 through 25' -- earlier probes only displayed the chunk's truncated first ~100 chars, missing it). p185's STANDARD END BEARING SEAT DEPTH table independently states the same fact in table form -- added as a second valid target." },
};

async function resolveQ4() {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id FROM standard_chunks WHERE document_id=$1::uuid AND page_start = ANY($2::int[]) AND parent_chunk_id IS NULL AND chunk_type='PROSE'`,
    AISC, [1505, 1786]
  );
  return rows.map((r) => r.id);
}

/** Burial figure: TRUE uncapped within-document rank, replicating each
 *  branch's own scoring formula exactly, no LIMIT. */
async function trueRank(doc: string, kind: "table" | "prose", targetIds: string[], qv: number[], qText: string) {
  const vecStr = `[${qv.join(",")}]`;
  if (kind === "table") {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      WITH child_scores AS (
        SELECT c.parent_chunk_id AS parent_id, 1 - (c.embedding <=> $1::vector) AS score
        FROM standard_chunks c
        WHERE c.chunk_type='TABLE' AND c.parent_chunk_id IS NOT NULL AND c.document_id=$2::uuid
      ),
      pooled AS (SELECT parent_id, MAX(score) AS score FROM child_scores GROUP BY parent_id),
      ranked AS (SELECT parent_id, score, ROW_NUMBER() OVER (ORDER BY score DESC) rn FROM pooled)
      SELECT parent_id, rn, score FROM ranked WHERE parent_id = ANY($3::uuid[])
    `, vecStr, doc, targetIds);
    const totalRows: any[] = await prisma.$queryRawUnsafe(`
      WITH child_scores AS (
        SELECT c.parent_chunk_id AS parent_id, 1 - (c.embedding <=> $1::vector) AS score
        FROM standard_chunks c
        WHERE c.chunk_type='TABLE' AND c.parent_chunk_id IS NOT NULL AND c.document_id=$2::uuid
      ) SELECT count(DISTINCT parent_id) AS n FROM child_scores
    `, vecStr, doc);
    const total = Number(totalRows[0].n);
    const best = rows.sort((a, b) => a.rn - b.rn)[0];
    return { rank: best ? Number(best.rn) : null, total, score: best ? Number(best.score) : null };
  } else {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      WITH base AS (
        SELECT c.id,
               1 - (c.embedding <=> $1::vector) AS dense_score,
               ts_rank(to_tsvector('english', c.text_content), plainto_tsquery('english', $2)) AS bm25_score
        FROM standard_chunks c
        WHERE c.parent_chunk_id IS NULL AND c.chunk_type IN ('PROSE','VISUAL')
          AND c.document_id=$3::uuid AND c.embedding IS NOT NULL
      ),
      dense_ranked AS (SELECT id, ROW_NUMBER() OVER (ORDER BY dense_score DESC) rnk FROM base),
      bm25_ranked AS (SELECT id, ROW_NUMBER() OVER (ORDER BY bm25_score DESC, dense_score DESC) rnk FROM base WHERE bm25_score > 0),
      fused AS (SELECT b.id, (1.0/(60+dr.rnk)) + COALESCE(1.0/(60+br.rnk),0) AS rrf_score
                FROM base b JOIN dense_ranked dr ON dr.id=b.id LEFT JOIN bm25_ranked br ON br.id=b.id),
      ranked AS (SELECT id, rrf_score, ROW_NUMBER() OVER (ORDER BY rrf_score DESC) rn FROM fused)
      SELECT id, rn, rrf_score FROM ranked WHERE id = ANY($4::uuid[])
    `, vecStr, qText, doc, targetIds);
    const totalRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*) AS n FROM standard_chunks
      WHERE parent_chunk_id IS NULL AND chunk_type IN ('PROSE','VISUAL') AND document_id=$1::uuid AND embedding IS NOT NULL
    `, doc);
    const total = Number(totalRows[0].n);
    const best = rows.sort((a: any, b: any) => a.rn - b.rn)[0];
    return { rank: best ? Number(best.rn) : null, total, score: best ? Number(best.rrf_score) : null };
  }
}

let tableFallbackCount = 0;
let tableProseCount = 0;

function rerankTextFor(c: RetrievedChunk): string {
  if (c.chunkType === "TABLE") {
    const r = renderTableForRerank(c.textContent);
    if (r.usedFallback) {
      tableFallbackCount++;
      console.log(`  [table-to-prose fallback] doc=${c.pdfName} page=${c.pageStart}: ${r.fallbackReason}`);
    } else {
      tableProseCount++;
    }
    return r.text;
  }
  if (c.chunkType !== "VISUAL" || !c.heading) return c.textContent;
  const prefix = c.heading + "\n\n";
  return c.textContent.startsWith(prefix) ? c.textContent.slice(prefix.length) : c.textContent;
}

async function main() {
  GT[4].ids = await resolveQ4();
  console.log("Q4 resolved ids:", GT[4].ids);

  const out: any[] = [];
  for (const [idStr, item] of Object.entries(GT)) {
    const id = Number(idStr);
    const qv = await embed(item.q);
    const [table, prose] = await Promise.all([
      tableBranch(qv, item.q, TOPK),
      proseBranch(item.q, qv, TOPK),
    ]);
    const pool = combineDocumentResultsNormalized(table, prose);

    let preRank: number | null = null;
    let matchedId: string | null = null;
    for (let i = 0; i < pool.length; i++) {
      if (item.ids.includes(pool[i].id)) { preRank = i + 1; matchedId = pool[i].id; break; }
    }

    let burial: any = null;
    if (preRank === null) {
      burial = await trueRank(item.doc, item.kind, item.ids, qv, item.q);
    }

    out.push({
      id, q: item.q, validIds: item.ids, note: item.note ?? null,
      poolSize: pool.length, preRank, matchedId,
      burialRank: burial?.rank ?? null, burialTotal: burial?.total ?? null,
      candidates: pool.map((c) => ({ id: c.id, pdfName: c.pdfName, pageStart: c.pageStart,
                                     chunkType: c.chunkType, text: rerankTextFor(c) })),
    });
    console.log(`[${id}] pool=${pool.length} preRank=${preRank ?? `ABSENT (true rank ${burial?.rank}/${burial?.total})`}`);
  }

  fs.writeFileSync("/tmp/corrected_pools.json", JSON.stringify(out));
  console.log(`\ntable-to-prose: ${tableProseCount} prose-rendered, ${tableFallbackCount} fell back to pipe`);
  console.log("wrote /tmp/corrected_pools.json");
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
