import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "../../../config/database/client";
import { classifyPageText } from "../services/classificationService";

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

      const pages = await prisma.standardPage.findMany({
        where: { documentId },
      });

      if (pages.length === 0) {
        throw new Error(`No pages found for document: ${documentId}`);
      }

      const updates = pages.map(page => {
        const classification = classifyPageText(page.textContent);
        return prisma.standardPage.update({
          where: { id: page.id },
          data: { classification },
        });
      });

      // Execute all updates in a single transaction
      await prisma.$transaction(updates);

      return true;
    },
    { connection: classificationWorkerConnection }
  );

  pageClassificationWorker.on("completed", (job) => {
    console.log(`[Page Classification] Job completed for documentId: ${job.data.documentId}`);
  });

  pageClassificationWorker.on("failed", (job, err) => {
    console.error(`[Page Classification] Job failed for documentId: ${job?.data.documentId}`, err);
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
