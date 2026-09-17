/**
 * (c) Pairwise reranker probe -- confirm format bias before touching serialization.
 * Dumps Q6's target chunk text plus its top rerank-beating competitors, for a
 * Python script to score head-to-head against bge-reranker-v2-m3.
 */
import fs from "fs";
import prisma from "../src/config/database/client";
import { tableBranch, proseBranch, combineDocumentResultsNormalized, RetrievedChunk } from "../src/modules/standards/services/retrievalTwoBranch";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }) });
  return ((await res.json()) as any).embedding;
}
function rerankTextFor(c: RetrievedChunk): string {
  if (c.chunkType !== "VISUAL" || !c.heading) return c.textContent;
  const prefix = c.heading + "\n\n";
  return c.textContent.startsWith(prefix) ? c.textContent.slice(prefix.length) : c.textContent;
}

async function main() {
  const q = "What is the standard hole size for a 3/4 inch bolt?";
  const targetId = "7b15f50c-eff6-480e-a0f2-a71ed3255c39";
  const qv = await embed(q);
  const [table, prose] = await Promise.all([tableBranch(qv, q, 15), proseBranch(q, qv, 15)]);
  const pool = combineDocumentResultsNormalized(table, prose);

  const targetIdx = pool.findIndex(c => c.id === targetId);
  console.log(`target pre-rank (post-normfix): ${targetIdx + 1}`);

  // dump the pool ordered as fed to the reranker, so we can identify by content what beat it
  fs.writeFileSync("/tmp/q6_probe_pool.json", JSON.stringify({
    q, targetId,
    candidates: pool.map(c => ({ id: c.id, pdfName: c.pdfName, pageStart: c.pageStart, chunkType: c.chunkType, text: rerankTextFor(c) })),
  }));
  console.log("wrote /tmp/q6_probe_pool.json");
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
