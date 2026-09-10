import fs from "fs";
import { tableBranch, proseBranch, combineDocumentResultsNormalized, RetrievedChunk } from "../src/modules/standards/services/retrievalTwoBranch";
import { renderTableForRerank } from "./table-to-prose-check";
import { generateQueryRewrites } from "../src/modules/standards/services/queryRewrite";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }) });
  return ((await res.json()) as any).embedding;
}
function rerankTextFor(c: RetrievedChunk): string {
  if (c.chunkType === "TABLE") return renderTableForRerank(c.textContent).text;
  if (c.chunkType !== "VISUAL" || !c.heading) return c.textContent;
  const prefix = c.heading + "\n\n";
  return c.textContent.startsWith(prefix) ? c.textContent.slice(prefix.length) : c.textContent;
}

const PAIRS = [
  { label: "Q1 fillet weld (v2)", original: "What is the minimum size of fillet welds?", awkward: "min weld allowed on steel", validIds: ["5980eb74-7daa-4d1d-a15e-af46bb60a292"] },
  { label: "Q7 washer size (v2)", original: "What washer size is needed for a 3/4 inch anchor rod?", awkward: "big washer for a small bolt in the plate", validIds: ["5455661d-5c52-459a-be5e-c295efc81a49"] },
  { label: "Q9 flange thickness (v2)", original: "What is the flange thickness of a W24x370?", awkward: "how thick is the top part of a W24x370 I beam", validIds: ["271e4ebc-50a5-48e9-81fa-c9b4406152f6"] },
  { label: "Q20 W-shape dims (v2)", original: "What are the depth, flange width, and flange thickness of a W24x370?", awkward: "give me all the measurements for a W24x370", validIds: ["271e4ebc-50a5-48e9-81fa-c9b4406152f6"] },
];

async function poolFor(q: string) {
  const qv = await embed(q);
  const [table, prose] = await Promise.all([tableBranch(qv, q, 15), proseBranch(q, qv, 15)]);
  const pool = combineDocumentResultsNormalized(table, prose);
  return pool.map(c => ({ id: c.id, pdfName: c.pdfName, pageStart: c.pageStart, chunkType: c.chunkType, text: rerankTextFor(c) }));
}
function preRankOf(pool: any[], validIds: string[]) {
  const idx = pool.findIndex(c => validIds.includes(c.id));
  return idx >= 0 ? idx + 1 : null;
}

async function main() {
  const out: any[] = [];
  for (const p of PAIRS) {
    console.log(`\n=== ${p.label} ===`);
    const originalPool = await poolFor(p.original);
    console.log(`  original: "${p.original}" -> pre-rank ${preRankOf(originalPool, p.validIds)}`);
    const awkwardPool = await poolFor(p.awkward);
    console.log(`  awkward:  "${p.awkward}" -> pre-rank ${preRankOf(awkwardPool, p.validIds)}`);

    const rewriteResult = await generateQueryRewrites(p.awkward);
    console.log(`  rewrite latency: ${rewriteResult.latencyMs.toFixed(0)}ms`);
    const rewritePools: any[] = [];
    for (const rw of rewriteResult.rewrites) {
      const pool = await poolFor(rw);
      const pre = preRankOf(pool, p.validIds);
      rewritePools.push({ rewrite: rw, pre, pool });
      console.log(`  rewrite:  "${rw}" -> pre-rank ${pre}`);
    }
    const best = rewritePools.filter(r => r.pre !== null).sort((a, b) => a.pre - b.pre)[0] || rewritePools[0];

    out.push({
      label: p.label, validIds: p.validIds,
      original: { q: p.original, pool: originalPool },
      awkward: { q: p.awkward, pool: awkwardPool },
      bestRewrite: { q: best.rewrite, pool: best.pool },
      allRewrites: rewritePools.map(r => ({ q: r.rewrite, pre: r.pre })),
    });
  }
  fs.writeFileSync("/tmp/rewrite_test2_pools.json", JSON.stringify(out));
  console.log("\nwrote /tmp/rewrite_test2_pools.json");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
