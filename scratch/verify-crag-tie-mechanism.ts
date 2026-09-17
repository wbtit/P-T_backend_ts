import { resolveProjectDocumentIds, generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch, combineDocumentResultsNormalized } from "../src/modules/standards/services/retrievalTwoBranch";
import { gradeRetrieval } from "../src/modules/standards/services/cragEvaluator";

const QUERIES = [
  "What is the standard hole diameter for a 3/4 inch bolt?", // known: both branches populated, tie
  "Show me the connection detail drawing for this steel frame joint",
  "gusset plate connection detail sketch",
  "erection procedure for steel joists during construction",
  "welding symbol notation used in this document",
  "warning about handling long span steel joists safely",
];

async function main() {
  const documentIds = await resolveProjectDocumentIds("5fa52afe-103f-4efc-afbd-23b7c6d2094d");
  for (const q of QUERIES) {
    const vec = await generateEmbedding(q);
    const [table, prose] = await Promise.all([
      tableBranch(vec, q, documentIds, 5),
      proseBranch(q, vec, documentIds, 5),
    ]);
    const pool = combineDocumentResultsNormalized(table, prose);
    const grade = gradeRetrieval(pool);
    console.log(`\nquery: "${q}"`);
    console.log(`  table candidates: ${table.length}, prose candidates: ${prose.length}`);
    console.log(`  rank1=${grade.rank1Score} rank2=${grade.rank2Score} gap=${grade.gap} grade=${grade.grade}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
