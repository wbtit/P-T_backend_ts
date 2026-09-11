/**
 * Phase 6 §1 -- UPLOAD's async worker. Wraps the real, tested Phase 2
 * pipeline (`ingestDocument()`, `manifestIngestion.ts`) in a BullMQ job, the
 * same pattern this project already trusts (the legacy `standardsIngestion`/
 * `pageClassification`/`chunking` chain used it) -- reusing the pattern, not
 * the pipeline. This is the only queue the new UPLOAD endpoint uses.
 *
 * Progress tracking: `status` moves PENDING -> PROCESSING -> PENDING (done,
 * awaiting ACTIVATE) or FAILED. `processingStage` carries the finer stage
 * inside PROCESSING (EXTRACTING -> CHUNKING -> EMBEDDING -> PERSISTING,
 * commit-only for the last two), via `ingestDocument()`'s new `onProgress`
 * callback. `ingestReport` holds the full IngestReport once a run completes,
 * whether dry-run or commit -- the async endpoint returns long before this
 * exists; STATUS polling is how a caller gets it.
 *
 * Retries: deliberately `attempts: 1`, not the legacy chain's `attempts: 3`.
 * A retry re-runs the ENTIRE extraction from scratch (BullMQ retries call the
 * worker fresh, `skipExtraction` is never set here) -- for a document that can
 * take minutes to extract, silently re-doing that on any transient hiccup
 * (Ollama momentarily down mid-embedding, e.g.) is a real cost, not a free
 * safety net. A failed run leaves the document `FAILED` with a real error
 * message; re-uploading is the explicit retry, not an automatic one. Flagged
 * as a deliberate deviation from the legacy pattern, not an oversight.
 */
import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "../../../config/database/client";
import { ingestDocument } from "./manifestIngestion";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const documentIngestionQueueConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const documentIngestionQueue = new Queue("document-ingestion", {
  connection: documentIngestionQueueConnection,
  defaultJobOptions: { attempts: 1 },
});

export interface DocumentIngestionJobPayload {
  documentId: string;
  pdfPath: string;
  manifestDir: string;
  imageDir: string;
  sourceType: "GENERAL" | "FABRICATOR";
  fabricatorId?: string | null;
  documentFamilyId?: string | null;
  edition?: string | null;
  commit: boolean;
}

export let documentIngestionWorker: Worker<DocumentIngestionJobPayload> | null = null;
export let documentIngestionWorkerConnection: IORedis | null = null;

export function startDocumentIngestionWorker() {
  if (documentIngestionWorker) return;

  documentIngestionWorkerConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  documentIngestionWorker = new Worker<DocumentIngestionJobPayload>(
    "document-ingestion",
    async (job: Job<DocumentIngestionJobPayload>) => {
      const { documentId, pdfPath, manifestDir, imageDir, sourceType, fabricatorId, documentFamilyId, edition, commit } = job.data;
      console.log(`[DocumentIngestion] picked up job for documentId: ${documentId} (commit=${commit})`);

      await prisma.standardDocument.update({
        where: { id: documentId },
        data: { status: "PROCESSING", processingStage: null, failureReason: null },
      });

      const report = await ingestDocument({
        documentId,
        pdfPath,
        manifestDir,
        imageDir,
        sourceType,
        fabricatorId: fabricatorId ?? null,
        documentFamilyId: documentFamilyId ?? null,
        edition: edition ?? null,
        commit,
        onProgress: (stage) => {
          // Best-effort -- a progress-write failure must not fail the ingest
          // itself; the real result is the final report, not this signal.
          prisma.standardDocument
            .update({ where: { id: documentId }, data: { processingStage: stage } })
            .catch((e: any) => console.error(`[DocumentIngestion] progress update failed for ${documentId}:`, e.message));
        },
      });

      await prisma.standardDocument.update({
        where: { id: documentId },
        data: {
          status: "PENDING",
          processingStage: null,
          ingestReport: report as any,
        },
      });

      console.log(`[DocumentIngestion] completed documentId: ${documentId} (committed=${report.committed})`);
      return report;
    },
    { connection: documentIngestionWorkerConnection, concurrency: 1 }
  );

  documentIngestionWorker.on("failed", async (job, err) => {
    console.error(`[DocumentIngestion] job failed for documentId: ${job?.data.documentId}`, err);
    if (job?.data.documentId) {
      try {
        await prisma.standardDocument.update({
          where: { id: job.data.documentId },
          data: { status: "FAILED", processingStage: null, failureReason: err.message },
        });
      } catch (dbErr: any) {
        console.error(`[DocumentIngestion] failed to record FAILED status for ${job.data.documentId}:`, dbErr.message);
      }
    }
  });
}

const gracefulShutdown = async () => {
  console.log("[DocumentIngestion] shutting down worker and queue...");
  if (documentIngestionWorker) await documentIngestionWorker.close();
  if (documentIngestionWorkerConnection) documentIngestionWorkerConnection.disconnect();
  await documentIngestionQueue.close();
  documentIngestionQueueConnection.disconnect();
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
