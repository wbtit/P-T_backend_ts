import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Dedicated connection for the Queue
export const queueConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Create the ingestion queue with exponential backoff defaults
export const standardsIngestionQueue = new Queue("standards-ingestion", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export interface StandardsIngestionJobPayload {
  documentId: string;
}

export let standardsIngestionWorker: Worker<StandardsIngestionJobPayload> | null = null;

// Start function to prevent auto-starting the worker when imported in tests
export const startStandardsIngestionWorker = () => {
  if (standardsIngestionWorker) return; // Prevent multiple starts

  // Dedicated blocking connection for the Worker
  const workerConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  // Create the worker stub for Phase 1
  standardsIngestionWorker = new Worker(
    "standards-ingestion",
    async (job: Job<StandardsIngestionJobPayload>) => {
      const { documentId } = job.data;
      console.log(`[Standards Ingestion] Worker stub picked up job for documentId: ${documentId}`);
      
      // Phase 1 stub: Just returning true to simulate success
      return true;
    },
    { connection: workerConnection }
  );

  standardsIngestionWorker.on("completed", (job) => {
    console.log(`[Standards Ingestion] Job completed for documentId: ${job.data.documentId}`);
  });

  standardsIngestionWorker.on("failed", (job, err) => {
    console.error(`[Standards Ingestion] Job failed for documentId: ${job?.data.documentId}`, err);
  });
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("[Standards Ingestion] Shutting down worker and queue...");
  if (standardsIngestionWorker) {
    await standardsIngestionWorker.close();
  }
  await standardsIngestionQueue.close();
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
