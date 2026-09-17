/**
 * Phase 5 §1.4 -- thin HTTP client for the reranker service
 * (`src/modules/standards/reranker/server.py`). Matches the pattern already
 * used for Ollama elsewhere in this project: `fetch()` a local endpoint,
 * JSON in/out. No retry/queueing logic -- single-request-only is the
 * confirmed Phase 5 design (see the service's own docstring); a failed or
 * slow reranker call surfaces as a thrown error, and the caller (chatService.ts)
 * decides what that means for the query, not this module.
 */

const RERANKER_URL = process.env.RERANKER_URL || "http://127.0.0.1:8008";

export interface RerankCandidate {
  id: string;
  text: string;
}

export interface RerankScore {
  id: string;
  score: number;
}

export async function rerank(query: string, candidates: RerankCandidate[]): Promise<RerankScore[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${RERANKER_URL}/rerank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, candidates }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`reranker service returned ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { scores: RerankScore[] };
    return data.scores;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`reranker call failed: ${error.message}`);
  }
}
