import { Job } from "bullmq";
import prisma from "../src/config/database/client";

jest.mock("@xenova/transformers", () => ({
  env: { allowLocalModels: false },
  AutoTokenizer: {
    from_pretrained: jest.fn().mockResolvedValue((text: string) => ({
      input_ids: { data: { length: Math.floor(text.length / 4) } }
    }))
  }
}));

jest.mock("../src/modules/standards/services/retrievalService", () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
  searchStandards: jest.fn()
}));

import { startChunkingWorker, chunkingWorker, chunkingQueue } from "../src/modules/standards/jobs/chunking";
import { StandardsVersioningService } from "../src/modules/standards/services/versioningService";

describe("Standards Ingestion Progress Tracking", () => {
  let docId: string;
  let familyId: string;

  beforeAll(async () => {
    const f = await prisma.standardFamily.upsert({
      where: { id: "TEST_PROG_FAM" },
      update: {},
      create: { id: "TEST_PROG_FAM", familyCode: "TF_PROG", edition: "1" }
    });
    familyId = f.id;
  });

  afterAll(async () => {
    if (chunkingWorker) {
      await chunkingWorker.close();
    }
    await chunkingQueue.close();

    await prisma.standardChunk.deleteMany({
      where: { documentId: docId }
    });
    await prisma.standardPage.deleteMany({
      where: { documentId: docId }
    });
    
    // Ensure we delete any randomly attached chat answers by concurrent tests
    await prisma.standardChatAnswer.deleteMany({
      where: { pinnedDocumentId: docId }
    });
    
    await prisma.standardDocument.deleteMany({
      where: { documentFamilyId: familyId }
    });
    await prisma.standardFamily.deleteMany({
      where: { id: familyId }
    });
    await prisma.$disconnect();
  });

  it("updates progress sequentially during chunking and recovers on failure", async () => {
    // Start worker in background
    startChunkingWorker();

    const doc = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: familyId,
        pdfName: "prog_test.pdf",
        storagePath: "dummy",
        status: "PENDING"
      }
    });
    docId = doc.id;

    // Create 150 dummy pages so we hit the 50 BATCH_SIZE at least twice
    const pages = Array.from({ length: 150 }).map((_, i) => ({
      documentId: docId,
      pageNumber: i + 1,
      imagePath: "dummy.png",
      textContent: `Page ${i + 1} content`,
      classification: "PROSE" as const
    }));

    await prisma.standardPage.createMany({
      data: pages
    });

    // We can simulate a worker job by directly calling the process function
    // But since it's BullMQ, the worker is already started. Let's add a job to the queue.
    await chunkingQueue.add("ingest", { documentId: docId });

    // Poll for progress
    const observedPagesProcessed: number[] = [];
    const observedProcessingStages: (string | null)[] = [];
    let completed = false;
    let failed = false;

    // Initial check right after queueing
    const initialCheck = await prisma.standardDocument.findUnique({ where: { id: docId } });
    if (initialCheck) {
      observedPagesProcessed.push(initialCheck.pagesProcessed);
      observedProcessingStages.push(initialCheck.processingStage);
    }

    // Wait up to 30 seconds for the job to complete
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      
      const check = await prisma.standardDocument.findUnique({
        where: { id: docId }
      });

      if (!check) continue;

      // Only record distinct new values to avoid noise
      if (observedPagesProcessed[observedPagesProcessed.length - 1] !== check.pagesProcessed) {
        observedPagesProcessed.push(check.pagesProcessed);
      }
      if (observedProcessingStages[observedProcessingStages.length - 1] !== check.processingStage) {
        observedProcessingStages.push(check.processingStage);
      }

      if (check.status === "ACTIVE") {
        completed = true;
        break;
      }
      if (check.status === "FAILED") {
        failed = true;
        break;
      }
    }

    // Give it a tiny buffer to let versioning transaction commit if it just broke out
    await new Promise((r) => setTimeout(r, 200));
    const finalCheck = await prisma.standardDocument.findUnique({ where: { id: docId } });
    if (finalCheck && observedProcessingStages[observedProcessingStages.length - 1] !== finalCheck.processingStage) {
      observedProcessingStages.push(finalCheck.processingStage);
    }

    console.log("Observed pagesProcessed sequence:", observedPagesProcessed);
    console.log("Observed processingStage sequence:", observedProcessingStages);

    expect(completed).toBe(true);
    expect(failed).toBe(false);

    // Assert that we saw an intermediate state between 0 and 150
    const sawIntermediateProgress = observedPagesProcessed.some(p => p > 0 && p < 150);
    expect(sawIntermediateProgress).toBe(true);

    // Assert the final state reached 150
    expect(observedPagesProcessed[observedPagesProcessed.length - 1]).toBe(150);

    // Assert that processingStage went to CHUNKING and then back to null
    expect(observedProcessingStages).toContain("CHUNKING");
    expect(observedProcessingStages[observedProcessingStages.length - 1]).toBeNull();

    // Verify chunks were created
    const chunks = await prisma.standardChunk.count({
      where: { documentId: docId }
    });
  }, 60000); // 60 seconds

  it("clears processingStage and sets FAILED status on worker error", async () => {
    // Create a document with missing pages to force a failure or throw an error
    const failDocId = "00000000-0000-4000-a000-000000000001";
    await prisma.standardDocument.create({
      data: {
        id: failDocId,
        sourceType: "GENERAL",
        pdfName: "fail.pdf",
        storagePath: "/fake/fail.pdf",
        status: "PENDING",
        processingStage: "CHUNKING" // Pre-set to chunking
      }
    });

    // Mock embedding to throw
    const retrievalMock = require("../src/modules/standards/services/retrievalService");
    retrievalMock.generateEmbedding.mockRejectedValueOnce(new Error("Simulated embedding crash"));

    // Add 1 page so it starts processing
    await prisma.standardPage.create({
      data: {
        documentId: failDocId,
        pageNumber: 1,
        imagePath: "dummy.png",
        textContent: "fail text",
        classification: "PROSE" as const
      }
    });

    await chunkingQueue.add("ingest", { documentId: failDocId });

    // Poll until FAILED
    let reachedFailed = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const check = await prisma.standardDocument.findUnique({ where: { id: failDocId } });
      if (check && check.status === "FAILED") {
        reachedFailed = true;
        break;
      }
    }

    expect(reachedFailed).toBe(true);

    const finalDoc = await prisma.standardDocument.findUnique({ where: { id: failDocId } });
    expect(finalDoc!.processingStage).toBeNull();
    expect(finalDoc!.failureReason).toBe("Simulated embedding crash");

    await prisma.standardDocument.delete({ where: { id: failDocId } });
  }, 15000);
});
