import { generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch, combineDocumentResultsNormalized } from "../src/modules/standards/services/retrievalTwoBranch";
import { gradeRetrieval } from "../src/modules/standards/services/cragEvaluator";

const CCD_ID = "7b3f5e0e-553d-45c8-ac5d-4dfa6e48b437";

const QUERIES = [
  "table of contents index",
  "gusset plate bolted moment connection with stiffener plates",
  "welding symbols and abbreviations legend",
  "beam to column shear tab connection",
  "cover page title",
];

async function main() {
  for (const q of QUERIES) {
    const vec = await generateEmbedding(q);
    const [t5, p5] = await Promise.all([
      tableBranch(vec, q, [CCD_ID], 5),
      proseBranch(q, vec, [CCD_ID], 5),
    ]);
    const pool5 = combineDocumentResultsNormalized(t5, p5);
    const grade5 = gradeRetrieval(pool5);
    console.log(`"${q}" -> table=${t5.length} prose=${p5.length} gap=${grade5.gap} grade=${grade5.grade}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
