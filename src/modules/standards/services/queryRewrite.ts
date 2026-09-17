/**
 * Phase 4 Step 4 -- query rewrite. Standalone module, NOT wired into the
 * live query path (chatService.ts / retrievalTwoBranch.ts) -- same pattern
 * as every other Phase 4 module: prove it in isolation, then ask before
 * wiring in.
 *
 * Client requirement: trainees often can't phrase a clear query even when
 * they know what they want. Suggest 3 corrected/clarified candidate
 * rewrites from the raw input; only run a query once the user picks one or
 * explicitly opts to search as typed. This module produces the 3 LLM
 * candidates; "search as typed" (the raw query, unmodified) is a 4th,
 * always-present option added by the caller, not generated here.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
const MODEL = "qwen2.5:latest"; // same model already in use for generation (chatService.ts)

const PROMPT_TEMPLATE = (rawQuery: string) => `You are a query-rewriting assistant for a structural steel fabrication reference system. Users are often trainees who know what they need but struggle to phrase it clearly.

Given the user raw query below, produce exactly 3 candidate rewrites that:
1. Clarify ambiguous or shorthand phrasing into a complete, specific question.
2. Expand abbreviations (e.g. dia -> diameter, std -> standard).
3. Align with how structural steel specifications and catalogs actually phrase things (formal technical/spec language: standard hole size, flange thickness, bearing seat depth, etc.), not casual paraphrasing.

Do NOT invent new requirements or change what is being asked -- only clarify the phrasing.

Respond with ONLY a JSON object in this exact form, no other text:
{"rewrites": ["rewrite 1", "rewrite 2", "rewrite 3"]}

RAW QUERY: ${rawQuery}
`;

export interface RewriteResult {
  rawQuery: string;
  rewrites: string[]; // exactly 3, LLM-generated, empty array on failure
  searchAsTyped: string; // always the raw query verbatim -- not LLM-generated, always present
  latencyMs: number;
  error: string | null;
}

export async function generateQueryRewrites(rawQuery: string): Promise<RewriteResult> {
  const t0 = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: PROMPT_TEMPLATE(rawQuery),
        format: "json",
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = performance.now() - t0;

    if (!response.ok) {
      return { rawQuery, rewrites: [], searchAsTyped: rawQuery, latencyMs, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { response: string };
    let parsed: { rewrites?: unknown };
    try {
      parsed = JSON.parse(data.response);
    } catch {
      return { rawQuery, rewrites: [], searchAsTyped: rawQuery, latencyMs, error: "unparseable JSON response" };
    }

    const rewrites = Array.isArray(parsed.rewrites)
      ? parsed.rewrites.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      : [];

    if (rewrites.length !== 3) {
      console.warn(`[QueryRewrite] expected 3 rewrites, got ${rewrites.length} for query: "${rawQuery}"`);
    }

    return { rawQuery, rewrites, searchAsTyped: rawQuery, latencyMs, error: null };
  } catch (error: any) {
    const latencyMs = performance.now() - t0;
    return { rawQuery, rewrites: [], searchAsTyped: rawQuery, latencyMs, error: error.message };
  }
}
