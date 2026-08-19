import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import { StandardsVersioningService } from "../services/versioningService";
import { generateEmbedding } from "../services/retrievalService";
import { env, AutoTokenizer } from "@xenova/transformers";

// Connection for Queue
export const chunkingQueueConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Connection for Worker
export const chunkingWorkerConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const chunkingQueue = new Queue("chunking-queue", {
  connection: chunkingQueueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  }
});

export let chunkingWorker: Worker | null = null;
let cachedTokenizer: any = null;

export function startChunkingWorker() {
  if (chunkingWorker) return;

  chunkingWorker = new Worker(
    "chunking-queue",
    async (job: Job) => {
      const { documentId } = job.data;
      if (!documentId) throw new Error("Missing documentId");

      if (!cachedTokenizer) {
        env.allowLocalModels = false;
        cachedTokenizer = await AutoTokenizer.from_pretrained('nomic-ai/nomic-embed-text-v1.5');
      }

      console.log(`[Chunking] Worker picked up job for documentId: ${documentId}`);
      if ((global as any).io) {
        (global as any).io.emit("standards-progress", { documentId, status: "CHUNKING", progress: 66 });
      }

      const doc = await prisma.standardDocument.findUnique({
        where: { id: documentId },
        include: { StandardPage: { orderBy: { pageNumber: 'asc' } } }
      });

      if (!doc || !doc.StandardPage || doc.StandardPage.length === 0) {
        throw new Error("Document not found or has no pages");
      }

      // Update initial progress state
      await prisma.standardDocument.update({
        where: { id: documentId },
        data: { 
          processingStage: "CHUNKING", 
          totalPages: doc.StandardPage.length, 
          pagesProcessed: 0, 
          failureReason: null 
        }
      });

      // 1. Idempotent cleanup first, in its own transaction (or just directly)
      await prisma.standardChunk.deleteMany({
        where: { documentId: doc.id }
      });

      let lastHeading = "";
      const headingRegex = /^\d+\)\s+.+$/;
      
      let pagesProcessed = 0;
      let batch: any[] = [];
      const BATCH_SIZE = 50;

      // 2. Process and insert in incremental batches
      for (const page of doc.StandardPage) {
        let producedChunk = false;
        
        if (page.textContent && page.classification) {
          if (!doc.excludedPages || !doc.excludedPages.includes(page.pageNumber)) {
            let embedText = page.textContent;

            const lines = page.textContent.split("\n");
            for (const line of lines) {
              if (headingRegex.test(line.trim())) {
                lastHeading = line.trim();
              }
            }

            if (page.classification === "VISUAL") {
              const contextPrefix = lastHeading ? `Context: Under section "${lastHeading}"\n\n` : `Context: Visual Page\n\n`;
              const textContent = page.textContent || "";
              let ocrText = page.ocrText || "";
              
              const SEPARATOR = "\n\n";
              const rawBudget = 4000 - contextPrefix.length - textContent.length - (textContent && ocrText ? SEPARATOR.length : 0);
              const budget = Math.max(0, rawBudget);
              
              if (budget > 0 && ocrText.length > budget) {
                ocrText = ocrText.substring(0, budget);
              } else if (budget === 0) {
                ocrText = "";
              }

              embedText = contextPrefix + [textContent, ocrText].filter(Boolean).join(SEPARATOR);
            }

            let finalEmbedText = embedText;
            let tokens = await cachedTokenizer(finalEmbedText, { truncation: false });
            let tokenCount = tokens.input_ids.data.length;

            if (tokenCount > 2000) {
              console.warn(`[Chunking] WARNING: Token backstop fired! Page ${page.pageNumber} has ${tokenCount} tokens.`);
              let charLimit = Math.floor(finalEmbedText.length * (2000 / tokenCount));
              finalEmbedText = finalEmbedText.substring(0, charLimit);
              
              tokens = await cachedTokenizer(finalEmbedText, { truncation: false });
              while (tokens.input_ids.data.length > 2000 && finalEmbedText.length > 100) {
                finalEmbedText = finalEmbedText.substring(0, finalEmbedText.length - 100);
                tokens = await cachedTokenizer(finalEmbedText, { truncation: false });
              }

              if (tokens.input_ids.data.length > 2000) {
                throw new Error(`Token backstop failed for Page ${page.pageNumber}.`);
              }
            }
            const embedding = await generateEmbedding(finalEmbedText);

            batch.push({
              documentId: doc.id,
              chunkType: page.classification,
              pageStart: page.pageNumber,
              pageEnd: page.pageNumber,
              textContent: embedText,
              sourceType: doc.sourceType,
              projectId: doc.projectId,
              fabricatorId: doc.fabricatorId,
              heading: lastHeading || null,
              embedding
            });
            producedChunk = true;
          } else {
            console.log(`[Chunking] Skipping excluded page: ${page.pageNumber}`);
          }
        }

        pagesProcessed++;

        // End of batch or end of document
        if (pagesProcessed % BATCH_SIZE === 0 || pagesProcessed === doc.StandardPage.length) {
          if (batch.length > 0) {
            await prisma.$transaction(async (tx) => {
              for (const c of batch) {
                const vectorString = `[${c.embedding.join(",")}]`;
                await tx.$executeRaw`
                  INSERT INTO standard_chunks (
                    id, document_id, chunk_type, page_start, page_end, text_content, 
                    source_type, project_id, fabricator_id, heading, embedding, created_at
                  ) VALUES (
                    gen_random_uuid(), ${c.documentId}::uuid, ${c.chunkType}::"StandardChunkType", 
                    ${c.pageStart}, ${c.pageEnd}, ${c.textContent}, ${c.sourceType}::"StandardSourceType", 
                    ${c.projectId}::uuid, ${c.fabricatorId}::uuid, ${c.heading}, ${vectorString}::vector, NOW()
                  )
                `;
              }
            });
            batch = [];
          }
          
          await prisma.standardDocument.update({
            where: { id: documentId },
            data: { pagesProcessed }
          });
          
          if ((global as any).io) {
            (global as any).io.emit("standards-progress", { 
              documentId, 
              status: "CHUNKING", 
              progress: Math.round((pagesProcessed / doc.StandardPage.length) * 100),
              pagesProcessed,
              totalPages: doc.StandardPage.length
            });
          }
        }
      }

      // 3. Atomic swap to activate the new document version
      const versioningService = new StandardsVersioningService();
      await versioningService.activateStandardDocument(documentId);

      return true;
    },
    {
      connection: chunkingWorkerConnection,
      concurrency: 1,
    }
  );

  chunkingWorker.on("completed", (job) => {
    console.log(`[Chunking] Job completed for documentId: ${job?.data.documentId}`);
    if (job?.data.documentId && (global as any).io) {
      (global as any).io.emit("standards-progress", { documentId: job.data.documentId, status: "COMPLETED", progress: 100 });
    }
  });

  chunkingWorker.on("failed", async (job, err) => {
    console.error(`[Chunking] Job failed for documentId: ${job?.data.documentId}`, err);
    if (job?.data.documentId) {
      if ((global as any).io) {
        (global as any).io.emit("standards-progress", { documentId: job.data.documentId, status: "FAILED", error: err.message });
      }
      try {
        await prisma.standardDocument.update({
          where: { id: job.data.documentId },
          data: { 
            status: "FAILED", 
            failureReason: err.message,
            processingStage: null 
          }
        });
      } catch (dbErr) {
        console.error(`[Chunking] Failed to update status to FAILED for documentId: ${job.data.documentId}`, dbErr);
      }
    }
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  if (chunkingWorker) {
    await chunkingWorker.close();
  }
  await chunkingQueue.close();
  chunkingQueueConnection.disconnect();
  if (chunkingWorkerConnection) {
    chunkingWorkerConnection.disconnect();
  }
});

process.on("SIGINT", async () => {
  if (chunkingWorker) {
    await chunkingWorker.close();
  }
  await chunkingQueue.close();
  chunkingQueueConnection.disconnect();
  if (chunkingWorkerConnection) {
    chunkingWorkerConnection.disconnect();
  }
});
