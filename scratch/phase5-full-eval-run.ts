import { askStandards } from "../src/modules/standards/services/chatService";
import { execSync } from "child_process";
import * as fs from "fs";

const PROJECT_ID = "5fa52afe-103f-4efc-afbd-23b7c6d2094d"; // Nabers, resolves the full GENERAL set incl. all 4 eval-corpus docs
const DOC_KEY_TO_ID: Record<string, string> = {
  AISC: "c98019bf-dfbb-460f-971a-f003a0c53077",
  EA: "396840ef-34a2-487e-aaf0-61de4f82f983",
  ccd: "0c45d683-fd41-4806-b291-22ac65b8a626",
  SJI: "8fa1a87d-4da8-466b-a574-a358c3c03ba4",
};
const DOC_KEY_TO_PDFNAME: Record<string, string> = {
  AISC: "AISC_Steel_construction_manual_fourteenth_edi.pdf",
  EA: "Expansion_Anchor_(316-327)r021.pdf",
  ccd: "completeconnectiondetails-2.pdf",
  SJI: "43rd_Edition_Catalog_Final_With_Errata1and2.pdf",
};

function gpuMem(): string {
  try {
    return execSync("nvidia-smi --query-gpu=memory.used,memory.free --format=csv,noheader").toString().trim();
  } catch {
    return "n/a";
  }
}

async function main() {
  const items = JSON.parse(fs.readFileSync("/tmp/eval22.json", "utf8"));
  const results: any[] = [];

  for (const item of items) {
    const t0 = Date.now();
    let outcome: any = { id: item.id, q: item.q, docKey: item.docKey, expectedPage: item.page };
    try {
      const result = await askStandards(PROJECT_ID, item.q);
      const a = result.answers[0];
      const hasRealAnswer = !!(a?.answerText && a.answerText.trim().length > 0);
      const citedPdf = a?.citations?.[0]?.citationPdfName;
      const citedPage = a?.citations?.[0]?.citationPageStart;
      outcome = {
        ...outcome,
        status: hasRealAnswer ? "ANSWERED" : (a?.generationFailureReason ? "DEFERRED" : "NO_ANSWER_NO_REASON"),
        generationFailureReason: a?.generationFailureReason ?? null,
        citedPdf,
        citedPage,
        expectedPdf: DOC_KEY_TO_PDFNAME[item.docKey],
        docMatch: citedPdf === DOC_KEY_TO_PDFNAME[item.docKey],
        ms: Date.now() - t0,
      };
    } catch (e: any) {
      outcome = { ...outcome, status: "ERROR", error: e.message, ms: Date.now() - t0 };
    }
    console.log(`[${item.id}] ${outcome.status} (${outcome.ms}ms) -- gpu: ${gpuMem()}`);
    results.push(outcome);
  }

  fs.writeFileSync("/tmp/eval22-results.json", JSON.stringify(results, null, 2));

  const counts: Record<string, number> = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log("\n=== SUMMARY ===");
  console.log(counts);
  console.log("docMatch among ANSWERED:", results.filter(r => r.status === "ANSWERED").map(r => r.docMatch));

  process.exit(0);
}
main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
