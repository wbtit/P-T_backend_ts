/**
 * Feature: 2-3 sentence page description (Google-image-search style),
 * generated at ingestion, shown per citation. FUTURE DOCUMENTS ONLY -- the 16
 * documents ingested before this feature keep `pageDescription: null` forever,
 * never backfilled (see manifestIngestion.ts's call site and schema.prisma's
 * comment on `StandardPage.pageDescription`).
 *
 * Real measured cost (design-time testing, 6 real corpus pages, qwen2.5, this
 * same Ollama instance): 1.19s-2.95s per page, ~1.6s average. For a 2325-page
 * document (AISC-scale) that is ~60 extra minutes of ingestion time -- a real,
 * accepted cost (approved as-is, no batching/parallelization built
 * speculatively; this project's single-worker/single-request-per-service
 * pattern already applies to the reranker for the same reason: one real
 * request in flight against a shared local model server at a time).
 *
 * Caller's responsibility, not this function's: skip pages with zero real
 * text/OCR content entirely (never call this with empty input) -- design
 * testing confirmed a real hallucination (a specific, confident, entirely
 * fabricated description) when fed a page with no real content at all. This
 * function does not guard against that itself; it assumes a real caller
 * already filtered to non-empty input, same division of responsibility as
 * `generateAnswerText()`'s `isUnreliable()` filtering upstream of it.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const MODEL = "qwen2.5:latest"; // same model already in use for generation/rewriting

const PROMPT_TEMPLATE = (text: string) => `You are describing one page of a structural steel fabrication reference document for a search result preview (like a Google Image search caption).

Write a 2-3 sentence description of what this page contains. Be specific and factual -- name what topic, table, or section this is, not a generic summary.

PAGE CONTENT:
${text.substring(0, 3000)}

Respond with ONLY the 2-3 sentence description, no preamble.`;

export async function generatePageDescription(pageText: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: PROMPT_TEMPLATE(pageText),
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[PageDescription] generation failed with status: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { response: string };
    const text = data.response?.trim();
    return text && text.length > 0 ? text : null;
  } catch (error: any) {
    console.warn(`[PageDescription] generation error: ${error.message}`);
    return null;
  }
}
