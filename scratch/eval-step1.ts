import fs from "fs";
import { retrieveTwoBranch, RetrievedChunk } from "../src/modules/standards/services/retrievalTwoBranch";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const TOPK_PER_DOC = 5;

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  const data = (await res.json()) as any;
  return data.embedding;
}

const DOC_KEY_TO_NAME: Record<string, string> = {
  AISC: "AISC_Steel_construction_manual_fourteenth_edi.pdf",
  SJI: "43rd_Edition_Catalog_Final_With_Errata1and2.pdf",
  "Hilti-EA": "Expansion_Anchor_(316-327)r021.pdf",
  ccd: "completeconnectiondetails-2.pdf",
};

async function main() {
  const evalSet = JSON.parse(fs.readFileSync("specs/phase3a-eval-set.json", "utf8"));
  const verified = evalSet.verified.filter((q: any) => q.docKey !== null && q.page !== null);
  console.log(`running ${verified.length} verified questions (skipping the refusal sanity check, no target page)\n`);

  let inTop5 = 0;
  const results: any[] = [];

  for (const item of verified) {
    const qv = await embed(item.q);
    const merged = await retrieveTwoBranch(item.q, qv, TOPK_PER_DOC);

    const targetName = DOC_KEY_TO_NAME[item.docKey];
    let rank = -1;
    for (let i = 0; i < merged.length; i++) {
      const c = merged[i];
      if (c.pdfName === targetName && item.page >= c.pageStart && item.page <= c.pageEnd) {
        rank = i + 1;
        break;
      }
    }
    const hit = rank > 0 && rank <= 5;
    if (hit) inTop5++;
    const top1 = merged[0];
    results.push({
      id: item.id, q: item.q, docKey: item.docKey, targetPage: item.page,
      rank: rank === -1 ? "MISS" : rank,
      top1_doc: top1?.pdfName?.slice(0, 25), top1_page: top1?.pageStart, top1_branch: top1?.branch,
      candidateCount: merged.length,
    });
    console.log(`[${item.id}] "${item.q.slice(0,55)}" -> target ${item.docKey} p${item.page} : rank=${rank === -1 ? "MISS" : rank} ${hit ? "OK" : "!!"}  (top1: ${top1?.pdfName?.slice(0,20)} p${top1?.pageStart} via ${top1?.branch})`);
  }

  console.log(`\n=== GATE: top-5 hits ===`);
  console.log(`${inTop5} / ${verified.length}  (gate: >=18/23)`);
  console.log(inTop5 >= 18 ? "GATE PASSED" : "GATE FAILED");

  fs.writeFileSync("/tmp/step1_eval_results.json", JSON.stringify(results, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
