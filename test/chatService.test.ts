import { isUnreliable } from "../src/modules/standards/services/chatService";
import { RetrievedChunk } from "../src/modules/standards/services/retrievalTwoBranch";

/**
 * Phase 5 §2 -- the exact scenario the build order named explicitly: a page
 * with one flagged PROSE chunk and one clean TABLE chunk must defer on the
 * prose (isUnreliable === true) and answer normally from the table
 * (isUnreliable === false), scoped per chunk, not per page. Amendment 11
 * guarantees a TABLE chunk never carries reliabilityReason -- this test
 * exercises the chatService.ts-side consequence of that guarantee, not the
 * ingestion-side invariant itself (already covered by manifestChunking.test.ts).
 */

function chunk(overrides: Partial<RetrievedChunk>): RetrievedChunk {
  return {
    id: "c1",
    documentId: "d1",
    pdfName: "test.pdf",
    sourceType: "GENERAL",
    documentFamilyId: null,
    familyCode: null,
    edition: null,
    chunkType: "PROSE",
    pageStart: 1,
    pageEnd: 1,
    textContent: "text",
    heading: null,
    reliabilityReason: null,
    score: 1,
    branch: "prose",
    hyperlinks: null,
    pageDescription: null,
    ...overrides,
  };
}

test("amendment 11 scenario: flagged PROSE chunk is unreliable, clean TABLE chunk on the same page is not", () => {
  const flaggedProse = chunk({
    id: "prose-1",
    chunkType: "PROSE",
    pageStart: 72,
    pageEnd: 72,
    reliabilityReason: "INTERLEAVED_TEXT",
    branch: "prose",
  });
  const cleanTable = chunk({
    id: "table-1",
    chunkType: "TABLE",
    pageStart: 72,
    pageEnd: 72,
    reliabilityReason: null,
    branch: "table",
  });

  expect(isUnreliable(flaggedProse)).toBe(true);
  expect(isUnreliable(cleanTable)).toBe(false);

  const pool = [flaggedProse, cleanTable];
  const reliable = pool.filter((c) => !isUnreliable(c));
  expect(reliable).toEqual([cleanTable]);
});

test("VISUAL chunkType is unreliable regardless of reliabilityReason", () => {
  const visual = chunk({ chunkType: "VISUAL", reliabilityReason: null, branch: "prose" });
  expect(isUnreliable(visual)).toBe(true);
});

test("a plain clean PROSE chunk is reliable", () => {
  const clean = chunk({ chunkType: "PROSE", reliabilityReason: null, branch: "prose" });
  expect(isUnreliable(clean)).toBe(false);
});
