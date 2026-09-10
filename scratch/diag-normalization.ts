/**
 * Diagnostic only -- no pipeline changes. Instruments Q2 (prose, AISC) and
 * Q21 (table, EA -- small corpus) end to end: raw score -> within-branch
 * RRF/pooled score -> the array actually passed into combineDocumentResultsNormalized
 * -> post-normalization score -> final pool rank. Shows exactly where the
 * rank moves and why.
 */
import fs from "fs";
import { tableBranch, proseBranch, combineDocumentResultsNormalized } from "../src/modules/standards/services/retrievalTwoBranch";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const TOPK = 15;

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }) });
  return ((await res.json()) as any).embedding;
}

function minMax(scores: number[]) { return { min: Math.min(...scores), max: Math.max(...scores) }; }
function normalize(score: number, r: {min:number;max:number}) { const span=r.max-r.min; return span>0 ? (score-r.min)/span : 0.5; }

async function diagnoseQ2() {
  const q = "What are the requirements for slip-critical bolted connections?";
  const targetId = "f6af27f4-3cba-439b-9320-5dbcf283e1b2";
  const qv = await embed(q);
  const [table, prose] = await Promise.all([tableBranch(qv, TOPK), proseBranch(q, qv, TOPK)]);

  console.log("\n========== Q2 (prose, AISC) ==========");
  console.log(`table branch pool size=${table.length}, prose branch pool size=${prose.length}`);

  // per-document breakdown of prose branch scores (RRF-fused, already computed by proseBranch)
  const byDoc = new Map<string, typeof prose>();
  for (const c of prose) { const arr = byDoc.get(c.documentId) ?? []; arr.push(c); byDoc.set(c.documentId, arr); }
  for (const [doc, items] of byDoc) {
    const scores = items.map(i=>i.score);
    console.log(`  doc=${doc.slice(0,8)} n=${items.length} scoreRange=[${Math.min(...scores).toFixed(6)}, ${Math.max(...scores).toFixed(6)}]`);
  }

  const target = prose.find(c => c.id === targetId);
  console.log(`\nTarget found in prose branch pool: ${!!target}`);
  if (target) {
    // its rank WITHIN its own document's prose branch slice (this is the inner RRF-fused rank, pre-cutoff already applied by topKPerDoc)
    const sameDoc = prose.filter(c => c.documentId === target.documentId).sort((a,b)=>b.score-a.score);
    const withinDocRank = sameDoc.findIndex(c=>c.id===targetId) + 1;
    console.log(`  raw within-branch RRF-fused score = ${target.score.toFixed(6)}`);
    console.log(`  within-branch rank among its OWN document's kept prose candidates (post topK=15 cutoff) = ${withinDocRank} of ${sameDoc.length}`);
  }

  // Global proseRange used by combineDocumentResultsNormalized (pooled across ALL documents)
  const proseRange = minMax(prose.map(c=>c.score));
  const tableRange = minMax(table.map(c=>c.score));
  console.log(`\nGLOBAL proseRange used for normalization (pooled across all 4 docs' kept candidates) = [${proseRange.min.toFixed(6)}, ${proseRange.max.toFixed(6)}]`);
  console.log(`GLOBAL tableRange = [${tableRange.min.toFixed(6)}, ${tableRange.max.toFixed(6)}]`);
  if (target) {
    const norm = normalize(target.score, proseRange);
    console.log(`  target's raw score ${target.score.toFixed(6)} normalized against GLOBAL prose range -> ${norm.toFixed(6)}`);
  }

  const pool = combineDocumentResultsNormalized(table, prose);
  const finalRank = pool.findIndex(c=>c.id===targetId) + 1;
  console.log(`\nFinal combined+normalized pool rank = ${finalRank} of ${pool.length}`);
  console.log(`Top 5 of final pool:`);
  pool.slice(0,5).forEach((c,i)=>console.log(`  ${i+1}. score=${c.score.toFixed(6)} branch=${c.branch} doc=${c.documentId.slice(0,8)} page=${c.pageStart} ${c.chunkType}`));
}

async function diagnoseQ21() {
  const q = "What nominal anchor diameters are covered for Kwik Bolt TZ expansion anchors?";
  const targetId = "b2fab378-4188-4ce2-ac15-a66f9a0f2a2a";
  const qv = await embed(q);
  const [table, prose] = await Promise.all([tableBranch(qv, TOPK), proseBranch(q, qv, TOPK)]);

  console.log("\n========== Q21 (table, EA -- small corpus) ==========");
  console.log(`table branch pool size=${table.length}`);

  const byDoc = new Map<string, typeof table>();
  for (const c of table) { const arr = byDoc.get(c.documentId) ?? []; arr.push(c); byDoc.set(c.documentId, arr); }
  for (const [doc, items] of byDoc) {
    const scores = items.map(i=>i.score);
    console.log(`  doc=${doc.slice(0,8)} n=${items.length} rawCosineRange=[${Math.min(...scores).toFixed(6)}, ${Math.max(...scores).toFixed(6)}]`);
  }

  const target = table.find(c => c.id === targetId);
  console.log(`\nTarget found in table branch pool: ${!!target}`);
  if (target) {
    const sameDoc = table.filter(c => c.documentId === target.documentId).sort((a,b)=>b.score-a.score);
    const withinDocRank = sameDoc.findIndex(c=>c.id===targetId) + 1;
    console.log(`  raw cosine score = ${target.score.toFixed(6)}`);
    console.log(`  within-document (EA) rank among EA's own kept table candidates = ${withinDocRank} of ${sameDoc.length}`);
  }

  const tableRange = minMax(table.map(c=>c.score));
  console.log(`\nGLOBAL tableRange used for normalization (pooled across all 4 docs' kept candidates) = [${tableRange.min.toFixed(6)}, ${tableRange.max.toFixed(6)}]`);
  if (target) {
    const norm = normalize(target.score, tableRange);
    console.log(`  target's raw cosine ${target.score.toFixed(6)} normalized against GLOBAL table range -> ${norm.toFixed(6)}`);
  }
  // what set the global max?
  const sortedTable = [...table].sort((a,b)=>b.score-a.score);
  console.log(`  GLOBAL max was set by: doc=${sortedTable[0].documentId.slice(0,8)} score=${sortedTable[0].score.toFixed(6)} page=${sortedTable[0].pageStart}`);

  const pool = combineDocumentResultsNormalized(table, prose);
  const finalRank = pool.findIndex(c=>c.id===targetId) + 1;
  console.log(`\nFinal combined+normalized pool rank = ${finalRank} of ${pool.length}`);
  console.log(`Top 10 of final pool:`);
  pool.slice(0,10).forEach((c,i)=>console.log(`  ${i+1}. score=${c.score.toFixed(6)} branch=${c.branch} doc=${c.documentId.slice(0,8)} page=${c.pageStart} ${c.chunkType}`));
}

async function main() {
  await diagnoseQ2();
  await diagnoseQ21();
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
