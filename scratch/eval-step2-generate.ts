/**
 * Step 2 prep: generate candidate pools (Step 1's output) for all 22 gradeable
 * eval questions, widened so presence-in-pool is a fair test, and dump to JSON
 * for the Python reranker to consume. Also computes and reports the redefined
 * Step 1 gate: target page present ANYWHERE in the pool, not rank<=5.
 */
import fs from "fs";
import { tableBranch, proseBranch, combineDocumentResultsNormalized } from "../src/modules/standards/services/retrievalTwoBranch";

const OLLAMA = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const TOPK_PER_DOC = 15; // widened from Step 1's 5, so presence-in-pool is a fair test

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA}/api/embeddings`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  return ((await res.json()) as any).embedding;
}

const DOC_KEY_TO_NAME: Record<string, string> = {
  AISC: "AISC_Steel_construction_manual_fourteenth_edi.pdf",
  SJI: "43rd_Edition_Catalog_Final_With_Errata1and2.pdf",
  "Hilti-EA": "Expansion_Anchor_(316-327)r021.pdf",
  ccd: "completeconnectiondetails-2.pdf",
};

/** VISUAL chunks are built as [heading, proseText, ocrText].join("\n\n").
 *  For reranking, strip the heading prefix -- this was the 256-token window
 *  bug from the old system: a boilerplate heading eating context budget that
 *  should go to the actual locating text. Uses the chunk's own stored heading
 *  field for an exact strip, not a guess. */
function rerankText(chunkType: string, heading: string | null, textContent: string): string {
  if (chunkType !== "VISUAL" || !heading) return textContent;
  const prefix = heading + "\n\n";
  return textContent.startsWith(prefix) ? textContent.slice(prefix.length) : textContent;
}

async function main() {
  const evalSet = JSON.parse(fs.readFileSync("specs/phase3a-eval-set.json", "utf8"));
  const verified = evalSet.verified.filter((q: any) => q.docKey !== null && q.page !== null);
  console.log(`generating candidate pools for ${verified.length} questions, topKPerDoc=${TOPK_PER_DOC}\n`);

  const out: any[] = [];
  let allPresent = true;
  const absent: any[] = [];

  for (const item of verified) {
    const qv = await embed(item.q);
    const [table, prose] = await Promise.all([
      tableBranch(qv, TOPK_PER_DOC),
      proseBranch(item.q, qv, TOPK_PER_DOC),
    ]);
    const merged = combineDocumentResultsNormalized(table, prose);

    const targetName = DOC_KEY_TO_NAME[item.docKey];
    let preRerankRank = -1;
    for (let i = 0; i < merged.length; i++) {
      const c = merged[i];
      if (c.pdfName === targetName && item.page >= c.pageStart && item.page <= c.pageEnd) {
        preRerankRank = i + 1;
        break;
      }
    }
    const present = preRerankRank > 0;
    if (!present) { allPresent = false; absent.push({ id: item.id, q: item.q }); }

    out.push({
      id: item.id, q: item.q, docKey: item.docKey, targetPage: item.page,
      poolSize: merged.length,
      preRerankRank: present ? preRerankRank : null,
      candidates: merged.map((c) => ({
        id: c.id, pdfName: c.pdfName, pageStart: c.pageStart, pageEnd: c.pageEnd,
        chunkType: c.chunkType,
        text: rerankText(c.chunkType, c.heading, c.textContent),
      })),
    });
    console.log(`[${item.id}] pool=${merged.length} preRerankRank=${present ? preRerankRank : "ABSENT"}`);
  }

  console.log(`\n=== redefined Step 1 gate: target present ANYWHERE in pool ===`);
  console.log(`all ${verified.length} present: ${allPresent}`);
  if (!allPresent) console.log("ABSENT:", absent);

  fs.writeFileSync("/tmp/step2_candidates.json", JSON.stringify(out));
  console.log(`\nwrote /tmp/step2_candidates.json (${out.length} questions)`);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
