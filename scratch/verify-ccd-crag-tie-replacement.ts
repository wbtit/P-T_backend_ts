import { generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch, combineDocumentResultsNormalized } from "../src/modules/standards/services/retrievalTwoBranch";
import { gradeRetrieval } from "../src/modules/standards/services/cragEvaluator";

const CCD_ID = "7b3f5e0e-553d-45c8-ac5d-4dfa6e48b437"; // newly re-ingested ccd, 84 VISUAL chunks, 0 tables

async function main() {
  const vec = await generateEmbedding("steel connection detail drawing");

  const [t1, p1] = await Promise.all([
    tableBranch(vec, "steel connection detail drawing", [CCD_ID], 1),
    proseBranch("steel connection detail drawing", vec, [CCD_ID], 1),
  ]);
  console.log("topKPerDoc=1: table=", t1.length, "prose=", p1.length);
  const pool1 = combineDocumentResultsNormalized(t1, p1);
  const grade1 = gradeRetrieval(pool1);
  console.log("grade1:", grade1);

  const [t5, p5] = await Promise.all([
    tableBranch(vec, "steel connection detail drawing", [CCD_ID], 5),
    proseBranch("steel connection detail drawing", vec, [CCD_ID], 5),
  ]);
  console.log("topKPerDoc=5: table=", t5.length, "prose=", p5.length);
  const pool5 = combineDocumentResultsNormalized(t5, p5);
  const grade5 = gradeRetrieval(pool5);
  console.log("grade5:", grade5);

  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
