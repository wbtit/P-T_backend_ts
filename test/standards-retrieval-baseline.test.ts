/**
 * Pre-OCR retrieval baseline — recorded 2026-08-12.
 *
 * Results are populated by the measurement run below. They intentionally record
 * raw nearest-neighbour similarity (without the production 0.6 threshold), so
 * below-threshold true matches and false positives remain observable.
 *
 * | Query | GSMS 8703… score/page | MM 0207… score/page |
 * | --- | --- | --- |
 * | column without cap plate | 0.483230 / 7 | 0.531943 / 13 |
 * | later wide gage standard angles | 0.479097 / 2 | 0.553150 / 8 |
 * | what are the drawing presentation requirements? | 0.560656 / 9 | 0.561022 / 56 |
 * | What sheet sizes should I use for detail drawings? | 0.571053 / 11 | 0.739919 / 2 |
 * | How do I calibrate a marine GPS compass? | 0.384871 / 1 | 0.452533 / 8 |
 * | steel recipe and carbon content | 0.478505 / 33 | 0.633515 / 66 |
 */
import prisma from "../src/config/database/client";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

const sources = [
  { label: "GSMS 8703…", documentId: "87037d08-cbeb-4f43-9b32-7868f49b4ce2" },
  { label: "MM 0207…", documentId: "0207eb4a-aa94-4ae0-8fd5-dd13d5ec2ab1" },
] as const;

const queries = [
  "column without cap plate",
  "later wide gage standard angles",
  "what are the drawing presentation requirements?",
  "What sheet sizes should I use for detail drawings?",
  "How do I calibrate a marine GPS compass?",
  "steel recipe and carbon content",
] as const;

type SearchRow = {
  pageStart: number;
  pageEnd: number;
  similarity: number;
};

async function embed(query: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: query }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding request failed: ${response.status} ${response.statusText}`);
  }

  return ((await response.json()) as { embedding: number[] }).embedding;
}

describe("Pre-OCR standards retrieval baseline", () => {
  jest.setTimeout(120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("prints the raw top result for each real query and intact document", async () => {
    for (const query of queries) {
      const embedding = await embed(query);
      const vector = `[${embedding.join(",")}]`;

      for (const source of sources) {
        const results = await prisma.$queryRawUnsafe<SearchRow[]>(`
          SELECT
            page_start AS "pageStart",
            page_end AS "pageEnd",
            1 - (embedding <=> $1::vector) AS similarity
          FROM standard_chunks
          WHERE document_id = $2::uuid
          ORDER BY embedding <=> $1::vector
          LIMIT 1
        `, vector, source.documentId);

        // This is a measurement harness: only assert that the search produced a result.
        expect(results.length).toBeGreaterThan(0);

        const top = results[0];
        console.log(
          `[Pre-OCR baseline] source=${source.label} query=${JSON.stringify(query)} ` +
          `similarity=${Number(top.similarity).toFixed(6)} page=${top.pageStart}-${top.pageEnd}`
        );
      }
    }
  });
});
