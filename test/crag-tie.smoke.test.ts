import { generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch, combineDocumentResultsNormalized } from "../src/modules/standards/services/retrievalTwoBranch";
import { gradeRetrieval } from "../src/modules/standards/services/cragEvaluator";

/**
 * Phase 5 pre-reranker finding, pinned as a regression guard, not just a
 * diagnostic. Confirmed directly (not assumed): `combineDocumentResultsNormalized()`
 * min-max normalizes the table and prose branches INDEPENDENTLY, so whenever
 * BOTH branches return at least one candidate, their two top-1s each
 * separately normalize to exactly 1.0 -- a forced, artificial tie that grades
 * AMBIGUOUS on effectively every real query touching both branches (verified
 * on 6 different real queries against a real 5-document scope, all tied at
 * rank1=rank2=1.0000, gap=0). This is NOT the general case being broken --
 * it is specific to the cross-branch comparison.
 *
 * When only ONE branch returns candidates, there is no second 1.0 to tie
 * against -- the surviving branch's own internal spread produces a genuine
 * gap, and CONFIDENT is reachable right now, before any reranker exists.
 * This test hits real chunks in the live DB (the Phase 5 §1.3 acceptance-test
 * fixture documents, a single PROSE chunk each, no TABLE content) to keep
 * proving that specific case works -- pinned so a reranker-era regression
 * ("this used to reach CONFIDENT, now it never does") gets caught, even
 * though the SCORE MECHANISM itself will be replaced by the reranker.
 *
 * Requires live Postgres + Ollama (embeddings) -- same infra every other
 * script in this project already assumes.
 */

const COBB_FIXTURE_DOC_ID = "b12fe0ad-6961-4a00-9f93-b9241750206d"; // single PROSE chunk, no tables
const RAY_FIXTURE_DOC_ID = "22e93f1f-ffff-4020-bfc3-dcba81ff4ef8"; // single PROSE chunk, no tables

jest.setTimeout(30000);

test("single-candidate scope: gap is null, CONFIDENT reachable (no rank-2 to tie against)", async () => {
  const vec = await generateEmbedding("steel joist standard specifications");
  const [table, prose] = await Promise.all([
    tableBranch(vec, "steel joist standard specifications", [COBB_FIXTURE_DOC_ID], 5),
    proseBranch("steel joist standard specifications", vec, [COBB_FIXTURE_DOC_ID], 5),
  ]);
  expect(table.length).toBe(0);
  expect(prose.length).toBe(1);

  const pool = combineDocumentResultsNormalized(table, prose);
  const grade = gradeRetrieval(pool);

  expect(grade.gap).toBeNull();
  expect(grade.grade).toBe("CONFIDENT");
});

test("two-candidate, one-branch-only scope: real (non-tied) gap, CONFIDENT reachable", async () => {
  const vec = await generateEmbedding("steel joist standard specifications");
  const documentIds = [COBB_FIXTURE_DOC_ID, RAY_FIXTURE_DOC_ID];
  const [table, prose] = await Promise.all([
    tableBranch(vec, "steel joist standard specifications", documentIds, 5),
    proseBranch("steel joist standard specifications", vec, documentIds, 5),
  ]);
  expect(table.length).toBe(0);
  expect(prose.length).toBe(2);

  const pool = combineDocumentResultsNormalized(table, prose);
  const grade = gradeRetrieval(pool);

  // The degenerate cross-branch tie (rank1 === rank2 === 1.0) must NOT occur
  // here -- this is exactly the shape that's currently broken when both
  // branches contribute, and exactly the shape that still works today.
  expect(grade.gap).not.toBeNull();
  expect(grade.gap).toBeGreaterThan(0);
  expect(grade.grade).toBe("CONFIDENT");
});
