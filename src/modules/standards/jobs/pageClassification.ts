import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "../../../config/database/client";
import { classifyPageText } from "../services/classificationService";
import { execFile } from "child_process";
import util from "util";
import path from "path";
import { isStandaloneStandardImage } from "../services/standardDocumentType";

const execFileAsync = util.promisify(execFile);

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Dedicated connection for the Queue
export const classificationQueueConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const pageClassificationQueue = new Queue("page-classification", {
  connection: classificationQueueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export interface PageClassificationJobPayload {
  documentId: string;
}

export let pageClassificationWorker: Worker<PageClassificationJobPayload> | null = null;
export let classificationWorkerConnection: IORedis | null = null;

export const startPageClassificationWorker = () => {
  if (pageClassificationWorker) return;

  classificationWorkerConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  pageClassificationWorker = new Worker(
    "page-classification",
    async (job: Job<PageClassificationJobPayload>) => {
      const { documentId } = job.data;
      console.log(`[Page Classification] Worker picked up job for documentId: ${documentId}`);
      if ((global as any).io) {
        (global as any).io.emit("standards-progress", { documentId, status: "CLASSIFYING", progress: 33 });
      }
      const doc = await prisma.standardDocument.findUnique({ where: { id: documentId } });
      if (!doc) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const pages = await prisma.standardPage.findMany({
        where: { documentId },
      });

      if (pages.length === 0) {
        throw new Error(`No pages found for document: ${documentId}`);
      }
      
      // Update DB to reflect CLASSIFYING start
      await prisma.standardDocument.update({
        where: { id: documentId },
        data: {
          processingStage: "CLASSIFYING",
          totalPages: pages.length,
          pagesProcessed: 0,
          failureReason: null
        }
      });

      const isStandaloneImage = isStandaloneStandardImage(doc.storagePath);

      const classifiedPages = pages.map(page => {
        const classification = isStandaloneImage ? "VISUAL" : classifyPageText(page.textContent);
        return { ...page, classification, ocrText: page.ocrText };
      });

      let pagesProcessed = 0;
      let batch: any[] = [];
      const BATCH_SIZE = 50;

      for (const page of classifiedPages) {
        if (page.classification === "VISUAL" && page.imagePath) {
          const absoluteImagePath = path.join(process.cwd(), page.imagePath);
          try {
            const { stdout } = await execFileAsync("tesseract", [absoluteImagePath, "stdout", "--psm", "11"]);
            if (stdout && stdout.trim().length > 0) {
              page.ocrText = stdout;
            }
          } catch (err) {
            throw new Error(`[Page Classification] Tesseract failed for ${absoluteImagePath}: ${err}`);
          }
        } else {
          page.ocrText = null;
        }

        batch.push(
          prisma.standardPage.update({
            where: { id: page.id },
            data: { 
              classification: page.classification,
              ocrText: page.ocrText || null
            },
          })
        );

        pagesProcessed++;

        if (batch.length >= BATCH_SIZE) {
          await prisma.$transaction(batch);
          await prisma.standardDocument.update({
            where: { id: documentId },
            data: { pagesProcessed }
          });
          batch = [];
        }
      }

      if (batch.length > 0) {
        await prisma.$transaction(batch);
        await prisma.standardDocument.update({
          where: { id: documentId },
          data: { pagesProcessed }
        });
      }
      
      try {
        const { chunkingQueue } = require("./chunking");
        await chunkingQueue.add("chunk", { documentId: job.data.documentId });
      } catch (err) {
        console.error(`[Page Classification] Failed to enqueue chunking for ${job.data.documentId}`, err);
      }

      return true;
    },
    { connection: classificationWorkerConnection }
  );

  pageClassificationWorker.on("completed", (job) => {
    console.log(`[Page Classification] Job completed for documentId: ${job.data.documentId}`);
  });

  pageClassificationWorker.on("failed", async (job, err) => {
    console.error(`[Page Classification] Job failed for documentId: ${job?.data.documentId}`, err);
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
        console.error(`[Page Classification] Failed to update status to FAILED for documentId: ${job.data.documentId}`, dbErr);
      }
    }
  });
};

const gracefulShutdown = async () => {
  console.log("[Page Classification] Shutting down worker and queue...");
  if (pageClassificationWorker) {
    await pageClassificationWorker.close();
  }
  if (classificationWorkerConnection) {
    classificationWorkerConnection.disconnect();
  }
  await pageClassificationQueue.close();
  classificationQueueConnection.disconnect();
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
