import { generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch, combineDocumentResultsNormalized } from "../src/modules/standards/services/retrievalTwoBranch";
import { gradeRetrieval } from "../src/modules/standards/services/cragEvaluator";

const COBB_FIXTURE = "b12fe0ad-6961-4a00-9f93-b9241750206d"; // single PROSE chunk, no tables
const RAY_FIXTURE = "22e93f1f-ffff-4020-bfc3-dcba81ff4ef8"; // single PROSE chunk, no tables

async function run(label: string, documentIds: string[], q: string) {
  const vec = await generateEmbedding(q);
  const [table, prose] = await Promise.all([
    tableBranch(vec, q, documentIds, 5),
    proseBranch(q, vec, documentIds, 5),
  ]);
  const pool = combineDocumentResultsNormalized(table, prose);
  const grade = gradeRetrieval(pool);
  console.log(`\n${label} :: "${q}"`);
  console.log(`  table=${table.length} prose=${prose.length}`);
  console.log(`  pool scores:`, pool.map(c => c.score.toFixed(4)));
  console.log(`  rank1=${grade.rank1Score} rank2=${grade.rank2Score} gap=${grade.gap} grade=${grade.grade}`);
}

async function main() {
  // Case 1: single document, no tables at all -- table branch empty, prose branch has exactly 1.
  await run("single no-table doc (1 prose candidate)", [COBB_FIXTURE], "steel joist standard specifications");

  // Case 2: two no-table documents -- table branch empty, prose branch has 2 distinct-scoring candidates.
  await run("two no-table docs (2 prose candidates)", [COBB_FIXTURE, RAY_FIXTURE], "steel joist standard specifications");

  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
