import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { RetrievedChunk } from "../services/retrievalService";

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
};

export const generationQueueConnection = new Redis(redisOptions);
export const generationWorkerConnection = new Redis(redisOptions);
export const generationEventsConnection = new Redis(redisOptions);

export const standardsGenerationQueue = new Queue("standards-generation", { connection: generationQueueConnection });
export const standardsGenerationEvents = new QueueEvents("standards-generation", { connection: generationEventsConnection });

export let standardsGenerationWorker: Worker | null = null;

const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

export function startStandardsGenerationWorker() {
  if (standardsGenerationWorker) return;

  standardsGenerationWorker = new Worker("standards-generation", async (job) => {
    const { query, chunks } = job.data as { query: string; chunks: RetrievedChunk[] };
    
    // Assemble context
    const contextText = chunks.map((c, i) => `[Source ${i + 1} - Page ${c.pageStart}]\n${c.textContent}`).join("\n\n");
    
    const prompt = `You are a structural steel detailing assistant. Answer the user's query using ONLY the provided standards context.
If the context does not contain any relevant information to answer the query, reply exactly with: "Not covered by this standard."
If the context contains relevant information, answer the query based on it, and DO NOT include the phrase "Not covered by this standard" in your response.
Do not hallucinate or guess.

CONTEXT:
${contextText}

QUERY: ${query}
`;

    console.log(`[Standards Generation] Generating response for query: "${query}"`);
    
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:latest",
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama generation failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response.trim();

  }, { 
    connection: generationWorkerConnection,
    concurrency: 1 // Strictly serialize generation to prevent CPU thrashing
  });
}
