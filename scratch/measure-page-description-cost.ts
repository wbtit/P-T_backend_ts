import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.1.11:11434";

async function generatePageDescription(text: string, chunkType: string): Promise<{ text: string | null; latencyMs: number }> {
  const prompt = `You are describing one page of a structural steel fabrication reference document for a search result preview (like a Google Image search caption).

Write a 2-3 sentence description of what this page contains. Be specific and factual -- name what topic, table, or section this is, not a generic summary.

PAGE CONTENT:
${text.substring(0, 3000)}

Respond with ONLY the 2-3 sentence description, no preamble, no "This page..." framing needed but factual content is required.`;

  const t0 = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen2.5:latest", prompt, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = performance.now() - t0;
    if (!response.ok) return { text: null, latencyMs };
    const data = (await response.json()) as { response: string };
    return { text: data.response?.trim() ?? null, latencyMs };
  } catch (e: any) {
    return { text: null, latencyMs: performance.now() - t0 };
  }
}

(async () => {
  const pageIds = [
    "f7b563d2-3c43-481a-a5c6-f2d2033b49ec", // VISUAL_ONLY, 0 text
    "7e38eef7-0b0c-41a9-8ffc-2ce76c189e33",
    "83c49b83-d094-4b2d-b521-410aa0b44919",
    "3dcff57a-932b-4eed-88e6-fd2252d48297",
    "5f3ca8a3-2cdf-4690-abdd-5506910be451",
    "36349ac0-7c4c-499a-8b30-44cfb86aa3bd",
  ];

  for (const id of pageIds) {
    const page = await prisma.standardPage.findUnique({ where: { id } });
    if (!page) continue;
    const chunkType = page.extractionStatus === "VISUAL_ONLY" ? "VISUAL" : "PROSE/TABLE";
    const inputText = page.textContent && page.textContent.trim().length > 0
      ? page.textContent
      : (page.ocrText || "(no text or OCR content available)");

    const result = await generatePageDescription(inputText, chunkType);
    console.log(`\n=== page ${page.pageNumber} (doc ${page.documentId}, status=${page.extractionStatus}, inputLen=${inputText.length}) ===`);
    console.log(`latency: ${(result.latencyMs / 1000).toFixed(2)}s`);
    console.log(`description: "${result.text}"`);
  }

  await prisma.$disconnect();
})();
