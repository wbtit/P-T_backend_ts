import fs from "fs";
import prisma from "../src/config/database/client";
import { tableBranch, proseBranch, combineDocumentResultsNormalized, RetrievedChunk } from "../src/modules/standards/services/retrievalTwoBranch";
import { renderTableForRerank } from "./table-to-prose-check";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const AISC = "c98019bf-dfbb-460f-971a-f003a0c53077";
const SJI = "8fa1a87d-4da8-466b-a574-a358c3c03ba4";
const EA = "396840ef-34a2-487e-aaf0-61de4f82f983";
const CCD = "0c45d683-fd41-4806-b291-22ac65b8a626";

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

const GT: Record<number, { q: string; doc: string; ids: string[] }> = {
  1:  { q: "What is the minimum size of fillet welds?", doc: AISC, ids: ["5980eb74-7daa-4d1d-a15e-af46bb60a292"] },
  2:  { q: "What are the requirements for slip-critical bolted connections?", doc: AISC, ids: ["f6af27f4-3cba-439b-9320-5dbcf283e1b2", "004ea459-3a95-42e5-b5ba-9551b3a2a61a"] },
  3:  { q: "What sequence should be followed when tightening shop bolts?", doc: AISC, ids: ["a92ca6fc-ce06-497b-ae1e-1df981ac86e4", "60939148-48d8-40f1-9978-9134bf4d7354"] },
  4:  { q: "What is the definition of a compact section?", doc: AISC, ids: ["3d383d33-f842-4875-b810-787027182ed5", "df9d4c7f-1932-4852-a7a1-12786545627b"] },
  5:  { q: "What is the standard hole size for a 1/2 inch bolt?", doc: AISC, ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  6:  { q: "What is the standard hole size for a 3/4 inch bolt?", doc: AISC, ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  7:  { q: "What washer size is needed for a 3/4 inch anchor rod?", doc: AISC, ids: ["5455661d-5c52-459a-be5e-c295efc81a49"] },
  8:  { q: "What is the maximum hole diameter for a 3/4 inch anchor rod in a base plate?", doc: AISC, ids: ["5455661d-5c52-459a-be5e-c295efc81a49"] },
  9:  { q: "What is the flange thickness of a W24x370?", doc: AISC, ids: ["271e4ebc-50a5-48e9-81fa-c9b4406152f6"] },
  10: { q: "What is the area of a W44x335?", doc: AISC, ids: ["6e3bf191-1f62-428e-8fcc-0ee1f9942136"] },
  11: { q: "What is the design flexural strength of a W12x65?", doc: AISC, ids: ["e2a5c891-67bb-43c7-993f-ed0e06f1f951"] },
  12: { q: "What is the seat depth for a K-series joist?", doc: SJI, ids: ["caa7137a-db0f-41c1-a289-a5bb6ca933a5"] },
  14: { q: "1/2 bolt dia hole size in shear plate", doc: AISC, ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  15: { q: "washer size for 3/4 anchor rod", doc: AISC, ids: ["5455661d-5c52-459a-be5e-c295efc81a49"] },
  16: { q: "what is k series joist seat depth", doc: SJI, ids: ["caa7137a-db0f-41c1-a289-a5bb6ca933a5"] },
  17: { q: "What is the standard hole size for a 5/8 inch bolt?", doc: AISC, ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  18: { q: "What is the standard hole size for a 7/8 inch bolt?", doc: AISC, ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  19: { q: "What is the standard hole size for a 1 inch bolt?", doc: AISC, ids: ["7b15f50c-eff6-480e-a0f2-a71ed3255c39"] },
  20: { q: "What are the depth, flange width, and flange thickness of a W24x370?", doc: AISC, ids: ["271e4ebc-50a5-48e9-81fa-c9b4406152f6"] },
  21: { q: "What nominal anchor diameters are covered for Kwik Bolt TZ expansion anchors?", doc: EA, ids: ["b2fab378-4188-4ce2-ac15-a66f9a0f2a2a"] },
  22: { q: "Show me connection detail 2X", doc: CCD, ids: ["46983591-096f-4710-a62b-3d8dd75f2f20"] },
  23: { q: "What is the minimum bearing seat depth for a DLH-series joist, chord section 18 through 25?", doc: SJI, ids: ["6be889ce-8b72-4f27-ac6d-1b104b0987e9", "c30f7e69-b542-46a9-8a8a-c7c58fdc3c87"] },
};

async function main() {
  const out: any[] = [];
  for (const [idStr, item] of Object.entries(GT)) {
    const id = Number(idStr);
    const qv = await embed(item.q);
    const [table, prose] = await Promise.all([tableBranch(qv, item.q, 15), proseBranch(item.q, qv, 15)]);
    const pool = combineDocumentResultsNormalized(table, prose);
    out.push({
      id, q: item.q, validIds: item.ids,
      candidates: pool.map(c => ({ id: c.id, pdfName: c.pdfName, pageStart: c.pageStart, chunkType: c.chunkType, text: rerankTextFor(c) })),
    });
    console.log(`built pool for Q${id}`);
  }
  fs.writeFileSync("/tmp/gap_full22_pools.json", JSON.stringify(out));
  console.log("wrote /tmp/gap_full22_pools.json");
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
