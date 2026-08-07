import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import util from "util";
import pdfParse from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import prisma from "../../../config/database/client";
import { pageClassificationQueue } from "./pageClassification";

const execFileAsync = util.promisify(execFile);

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
export let workerConnection: IORedis | null = null;

async function extractTextPerPage(buffer: Buffer): Promise<string[]> {
  const pages: string[] = [];
  const options = {
    pagerender: async function(pageData: any) {
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });
      let lastY, text = '';
      for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY){
              text += item.str;
          } else {
              text += '\n' + item.str;
          }
          lastY = item.transform[5];
      }
      pages.push(text);
      return text;
    }
  };
  await pdfParse(buffer, options);
  return pages;
}

// Start function to prevent auto-starting the worker when imported in tests
export const startStandardsIngestionWorker = () => {
  if (standardsIngestionWorker) return; // Prevent multiple starts

  // Dedicated blocking connection for the Worker
  workerConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  // Create the worker
  standardsIngestionWorker = new Worker(
    "standards-ingestion",
    async (job: Job<StandardsIngestionJobPayload>) => {
      const { documentId } = job.data;
      console.log(`[Standards Ingestion] Worker picked up job for documentId: ${documentId}`);
      
      const doc = await prisma.standardDocument.findUnique({ where: { id: documentId } });
      if (!doc) throw new Error(`Document not found: ${documentId}`);

      const pdfBuffer = await fs.promises.readFile(doc.storagePath);
      
      // 1. Extract text per page
      const pagesText = await extractTextPerPage(pdfBuffer);
      
      const uploadBaseDir = path.resolve(process.cwd(), "uploads");
      const outputDir = path.join(uploadBaseDir, "standards", doc.sourceType, doc.id, "pages");
      
      const tempDir = path.join(process.cwd(), "tmp", `pdftoppm_${uuidv4()}`);
      await fs.promises.mkdir(tempDir, { recursive: true });

      try {
        // 2. Render images using pdftoppm
        await execFileAsync("pdftoppm", ["-png", "-r", "150", doc.storagePath, path.join(tempDir, "page")]);
        const files = await fs.promises.readdir(tempDir);
        const pngFiles = files.filter(f => f.endsWith(".png")).sort();
        
        if (pngFiles.length !== pagesText.length) {
          throw new Error(`Page count mismatch: pdftoppm generated ${pngFiles.length} images, but pdf-parse found ${pagesText.length} pages.`);
        }
        
        const allPagesData = [];
        for (let i = 0; i < pngFiles.length; i++) {
          const pageNumber = i + 1;
          const padLength = pagesText.length.toString().length;
          const finalFilename = `page-${String(i + 1).padStart(padLength, "0")}.png`;
          const finalTempPath = path.join(tempDir, finalFilename);
          
          await fs.promises.rename(path.join(tempDir, pngFiles[i]), finalTempPath);
          
          // Must match the prefix expected by frontend (e.g. /uploads/...)
          const relativeImagePath = `/uploads/standards/${doc.sourceType}/${doc.id}/pages/${finalFilename}`;
          
          allPagesData.push({
            documentId: doc.id,
            pageNumber: pageNumber,
            imagePath: relativeImagePath,
            textContent: pagesText[i],
          });
        }
        
        const backupDir = `${outputDir}.old-${uuidv4()}`;
        const hadPreviousOutput = fs.existsSync(outputDir);
        if (hadPreviousOutput) {
          await fs.promises.rename(outputDir, backupDir);
        }
        
        // Ensure parent directory exists for new output dir
        await fs.promises.mkdir(path.dirname(outputDir), { recursive: true });
        
        // Atomically move the fully staged temp directory into place
        await fs.promises.rename(tempDir, outputDir);
        
        // 3. Atomic database commit
        await prisma.$transaction([
          prisma.standardPage.deleteMany({ where: { documentId: doc.id } }),
          prisma.standardPage.createMany({ data: allPagesData })
        ]);
        
        // Cleanup backup if transaction succeeds
        if (hadPreviousOutput) {
          await fs.promises.rm(backupDir, { recursive: true, force: true });
        }
        
        // 4. Trigger Phase 3 Classification
        try {
          await pageClassificationQueue.add("classify", { documentId: doc.id });
        } catch (err) {
          console.error(`[Standards Ingestion] Failed to enqueue classification for ${doc.id}`, err);
          // Extraction itself succeeded — don't fail this job. The classification
          // sweeper (deferred, documented in the Phase 3 spec) is responsible for
          // catching documents left at classification: null.
        }
        
        return true;
      } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
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
  if (workerConnection) {
    workerConnection.disconnect();
  }
  await standardsIngestionQueue.close();
  queueConnection.disconnect();
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
