import prisma from "../src/config/database/client";
import fs from "fs";

const DOCS = {
  GSMS: '80cf6e98-5efc-44a1-adc0-9e2b9445dd9d',
  MM: '0207eb4a-aa94-4ae0-8fd5-dd13d5ec2ab1'
};

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

async function generateQuestionsForText(text: string): Promise<string[]> {
  if (!text.trim()) return [];
  // Truncate to avoid exploding context
  if (text.length > 5000) text = text.substring(0, 5000);

  const prompt = `You are an expert steel detailer. I will give you a page of standard shop drawing instructions.
Your task is to write 2 plausible, practical questions that a working detailer would ask, which this page directly answers.

CRITICAL CONSTRAINTS:
1. DO NOT copy the page's vocabulary verbatim. Use synonyms, loose phrasing, abbreviations, or imprecise terms a detailer might use.
2. Return ONLY a JSON array of strings, like ["question 1", "question 2"]. No other text, no markdown block.

Page Text:
${text}

JSON Array:`;

  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:latest",
        prompt,
        stream: false,
        format: "json",
        options: { temperature: 0.7 }
      })
    });
    const data = (await res.json()) as any;
    
    const responseText = data.response || "";
    const matchArray = responseText.match(/\[[\s\S]*\]/);
    const matchObj = responseText.match(/\{[\s\S]*\}/);
    
    let parsed: any = null;
    try {
      if (matchArray) parsed = JSON.parse(matchArray[0]);
      else if (matchObj) parsed = JSON.parse(matchObj[0]);
      else parsed = JSON.parse(responseText);
    } catch (e) {
      // ignore
    }

    if (Array.isArray(parsed)) {
      return parsed.slice(0, 2);
    } else if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).slice(0, 2).map(String);
    }
  } catch (e) {
    console.error("Failed to generate:", e);
  }
  return [];
}

async function run() {
  const dataset: any[] = [];
  
  for (const [docKey, docId] of Object.entries(DOCS)) {
    console.log(`Processing ${docKey}...`);
    const pages = await prisma.standardPage.findMany({
      where: { documentId: docId },
      orderBy: { pageNumber: 'asc' }
    });

    for (const page of pages) {
      const text = [page.textContent, page.ocrText].filter(Boolean).join("\n\n");
      if (!text.trim()) continue;

      const questions = await generateQuestionsForText(text);
      for (const q of questions) {
        dataset.push({
          question: q,
          docKey,
          docId,
          correctPage: page.pageNumber,
          classification: page.classification,
          sourceText: text.substring(0, 200) + "..." // preview only
        });
      }
      console.log(`Generated ${questions.length} questions for ${docKey} Page ${page.pageNumber}`);
    }
  }

  // Split into DEV (30%) and HOLDOUT (70%)
  // We'll shuffle deterministically or just use Math.random
  dataset.sort(() => Math.random() - 0.5);
  const splitIdx = Math.floor(dataset.length * 0.3);
  
  const devSet = dataset.slice(0, splitIdx);
  const holdoutSet = dataset.slice(splitIdx);

  const output = {
    dev: devSet,
    holdout: holdoutSet
  };

  fs.writeFileSync("docs/specs/eval-set.json", JSON.stringify(output, null, 2));
  console.log(`Total questions: ${dataset.length}. DEV: ${devSet.length}, HOLDOUT: ${holdoutSet.length}. Saved to docs/specs/eval-set.json`);
}

run().catch(console.error).finally(() => process.exit(0));
