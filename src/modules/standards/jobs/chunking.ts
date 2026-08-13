import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import { StandardsVersioningService } from "../services/versioningService";
import { generateEmbedding } from "../services/retrievalService";

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

export function startChunkingWorker() {
  if (chunkingWorker) return;

  chunkingWorker = new Worker(
    "chunking-queue",
    async (job: Job) => {
      const { documentId } = job.data;
      if (!documentId) throw new Error("Missing documentId");

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

      const chunksToInsert: Array<{
        documentId: string;
        chunkType: any;
        pageStart: number;
        pageEnd: number;
        textContent: string;
        sourceType: string;
        projectId: string | null;
        fabricatorId: string | null;
        heading: string | null;
        embedding: number[];
      }> = [];

      let lastHeading = "";
      const headingRegex = /^\d+\)\s+.+$/;

      // 1. Process all pages in memory
      for (const page of doc.StandardPage) {
        if (!page.textContent || !page.classification) continue;

        let embedText = page.textContent;

        // Check for a new heading on ALL pages (headings can appear on VISUAL pages too)
        const lines = page.textContent.split("\n");
        for (const line of lines) {
          if (headingRegex.test(line.trim())) {
            lastHeading = line.trim();
          }
        }

        if (page.classification === "VISUAL") {
          // Prepend context for VISUAL pages
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

        const embedding = await generateEmbedding(embedText);

        chunksToInsert.push({
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
      }

      // 2. Atomic Database Insert
      await prisma.$transaction(async (tx) => {
        // Idempotent cleanup
        await tx.standardChunk.deleteMany({
          where: { documentId: doc.id }
        });

        for (const chunk of chunksToInsert) {
          const vectorString = `[${chunk.embedding.join(",")}]`;
          await tx.$executeRaw`
            INSERT INTO standard_chunks (
              id, document_id, chunk_type, page_start, page_end, text_content, 
              source_type, project_id, fabricator_id, heading, embedding, created_at
            ) VALUES (
              gen_random_uuid(), 
              ${chunk.documentId}::uuid, 
              ${chunk.chunkType}::"StandardChunkType", 
              ${chunk.pageStart}, 
              ${chunk.pageEnd}, 
              ${chunk.textContent}, 
              ${chunk.sourceType}::"StandardSourceType", 
              ${chunk.projectId}::uuid, 
              ${chunk.fabricatorId}::uuid, 
              ${chunk.heading},
              ${vectorString}::vector, 
              NOW()
            )
          `;
        }
      });

      // Atomic swap to activate the new document version
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
          data: { status: "FAILED" }
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
