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
 * Pinned so a reranker-era regression ("this used to reach CONFIDENT, now it
 * never does") gets caught, even though the SCORE MECHANISM itself is
 * replaced by the reranker once wired.
 *
 * Phase 6: no longer uses purpose-built fixture documents living in the real
 * corpus (the original `b12fe0ad`/`22e93f1f` FABRICATOR test fixtures) --
 * those were removed from the live corpus per an explicit cleanup pass, and
 * this test's own dependency on them was the reason flagged before deleting.
 * Replaced with `completeconnectiondetails-2.pdf` (real, ACTIVE, re-ingested
 * this session): 84 pages, ALL `chunk_type='VISUAL'` (100% scanned), zero
 * TABLE chunks by construction (confirmed via its own real ingestReport,
 * `byType: {"VISUAL": 84}`) -- a real document that happens to have exactly
 * the "one branch only" shape this test needs, not a synthetic stand-in.
 *
 * Requires live Postgres + Ollama (embeddings) -- same infra every other
 * script in this project already assumes.
 */

const CCD_DOCUMENT_ID = "7b3f5e0e-553d-45c8-ac5d-4dfa6e48b437"; // completeconnectiondetails-2.pdf, real, ACTIVE, 84 VISUAL chunks, 0 tables

jest.setTimeout(30000);

test("single-candidate scope: gap is null, CONFIDENT reachable (no rank-2 to tie against)", async () => {
  const query = "steel connection detail drawing";
  const vec = await generateEmbedding(query);
  // topKPerDoc=1 forces exactly one prose candidate; table is 0 by
  // construction (ccd has no TABLE chunks at all) -- pool size 1, total.
  const [table, prose] = await Promise.all([
    tableBranch(vec, query, [CCD_DOCUMENT_ID], 1),
    proseBranch(query, vec, [CCD_DOCUMENT_ID], 1),
  ]);
  expect(table.length).toBe(0);
  expect(prose.length).toBe(1);

  const pool = combineDocumentResultsNormalized(table, prose);
  const grade = gradeRetrieval(pool);

  expect(grade.gap).toBeNull();
  expect(grade.grade).toBe("CONFIDENT");
});

test("multi-candidate, one-branch-only scope: real (non-tied) gap, CONFIDENT reachable", async () => {
  // Verified directly against real data before picking this query (not every
  // query against ccd clears the threshold -- a generic "connection detail"
  // query returns several genuinely similar pages and correctly grades
  // AMBIGUOUS; that's a real, valid outcome, just not this test's target
  // shape). "table of contents index" targets one clearly distinct page.
  const query = "table of contents index";
  const vec = await generateEmbedding(query);
  const [table, prose] = await Promise.all([
    tableBranch(vec, query, [CCD_DOCUMENT_ID], 5),
    proseBranch(query, vec, [CCD_DOCUMENT_ID], 5),
  ]);
  expect(table.length).toBe(0);
  expect(prose.length).toBeGreaterThanOrEqual(2);

  const pool = combineDocumentResultsNormalized(table, prose);
  const grade = gradeRetrieval(pool);

  // The degenerate cross-branch tie (rank1 === rank2 === 1.0) must NOT occur
  // here -- this is exactly the shape that's currently broken when both
  // branches contribute, and exactly the shape that still works today.
  expect(grade.gap).not.toBeNull();
  expect(grade.gap).toBeGreaterThan(0);
  expect(grade.grade).toBe("CONFIDENT");
});
