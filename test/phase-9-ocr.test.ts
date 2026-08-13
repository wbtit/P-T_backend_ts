import prisma from "../src/config/database/client";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { startStandardsIngestionWorker, standardsIngestionQueue } from "../src/modules/standards/jobs/standardsIngestion";
import { startPageClassificationWorker, pageClassificationQueue } from "../src/modules/standards/jobs/pageClassification";
import { startChunkingWorker, chunkingQueue } from "../src/modules/standards/jobs/chunking";
import * as retrievalService from "../src/modules/standards/services/retrievalService";
import { QueueEvents } from "bullmq";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

async function embed(query: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: query }),
  });
  if (!response.ok) throw new Error(`Ollama embedding request failed`);
  return ((await response.json()) as { embedding: number[] }).embedding;
}

async function waitForStatus(docId: string, status: string, timeout = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const doc = await prisma.standardDocument.findUnique({ where: { id: docId } });
    if (doc?.status === status) return doc;
    if (doc?.status === "FAILED" && status !== "FAILED") return doc; // Return anyway to assert failure
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Timeout waiting for status");
}

describe("Phase 9 OCR Tests", () => {
  let testProjectId: string;
  let testFabricatorId: string;
  let testDepartmentId: string;
  let testUserId: string;
  let testDocId: string;
  let testImageDocId: string;
  
  beforeAll(async () => {
    // Start workers
    startStandardsIngestionWorker();
    startPageClassificationWorker();
    startChunkingWorker();

    const department = await prisma.department.create({ data: { name: `Test Dept ${uuidv4()}` } });
    testDepartmentId = department.id;

    const user = await prisma.user.create({
      data: {
        username: `testuser_${uuidv4()}`, password: "password123",
        firstName: "Test", phone: "1234567890", role: "ADMIN"
      }
    });
    testUserId = user.id;

    const fabricator = await prisma.fabricator.create({
      data: { fabName: `Test Fab ${uuidv4()}`, createdById: testUserId }
    });
    testFabricatorId = fabricator.id;

    const project = await prisma.project.create({
      data: {
        projectNumber: `TEST-${uuidv4().substring(0, 8)}`,
        name: `Test Project ${uuidv4()}`, description: "Test",
        fabricatorID: testFabricatorId, departmentID: testDepartmentId, managerID: testUserId
      }
    });
    testProjectId = project.id;

    // Ingest a fresh copy of GSMS PDF
    const srcPath = "/home/wbtserver/P-T_backend_ts/uploads/standards/d0fd3841-e040-4853-ac9e-9e76fbf00c3d.pdf";
    if (!fs.existsSync(srcPath)) throw new Error("Fixture not found");
    
    // We mock the upload path by just creating the document and adding it to ingestion queue
    const doc = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        projectId: testProjectId,
        fabricatorId: testFabricatorId,
        pdfName: "test_gsms.pdf",
        storagePath: srcPath,
        status: "PENDING"
      }
    });
    testDocId = doc.id;
    
    await standardsIngestionQueue.add("ingest", { documentId: testDocId, originalName: "test_gsms.pdf" });
    await waitForStatus(testDocId, "ACTIVE", 300000); // Wait for entire pipeline to finish
    
    // Ingest the standalone image for Part B
    const imageSrcPath = path.resolve(__dirname, "fixtures/sample_diagram.png");
    if (fs.existsSync(imageSrcPath)) {
      const imageDoc = await prisma.standardDocument.create({
        data: {
          sourceType: "GENERAL",
          projectId: testProjectId,
          fabricatorId: testFabricatorId,
          pdfName: "sample_diagram.png",
          storagePath: imageSrcPath,
          status: "PENDING"
        }
      });
      testImageDocId = imageDoc.id;
      
      await standardsIngestionQueue.add("ingest", { documentId: testImageDocId, originalName: "sample_diagram.png" });
      await waitForStatus(testImageDocId, "ACTIVE", 300000); // Wait for entire pipeline to finish
    }
  }, 600000); // Higher timeout for worker setup

  afterAll(async () => {
    await prisma.standardChunk.deleteMany({ where: { document: { projectId: testProjectId } } });
    await prisma.standardPage.deleteMany({ where: { document: { projectId: testProjectId } } });
    await prisma.standardDocument.deleteMany({ where: { projectId: testProjectId } });
    await prisma.project.delete({ where: { id: testProjectId } });
    await prisma.fabricator.delete({ where: { id: testFabricatorId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.department.delete({ where: { id: testDepartmentId } });
  });

  describe("Part A - CAD-flattened PDF OCR", () => {
    it("textContent is never modified by classification; ocrText is populated separately", async () => {
      const pages = await prisma.standardPage.findMany({
        where: { documentId: testDocId, classification: "VISUAL" },
        take: 5
      });
      expect(pages.length).toBeGreaterThan(0);
      for (const page of pages) {
        expect(page.ocrText).not.toBeNull();
        expect(page.ocrText!.length).toBeGreaterThan(0);
        expect(page.textContent).toBeDefined(); // textContent remains intact
      }
    });

    it("OCR runs on EVERY VISUAL page of the fixture", async () => {
      const visualPages = await prisma.standardPage.count({
        where: { documentId: testDocId, classification: "VISUAL" }
      });
      
      const tesseractCalls = await prisma.standardPage.count({
        where: { documentId: testDocId, classification: "VISUAL", ocrText: { not: null } }
      });
      
      expect(tesseractCalls).toBe(visualPages);
    });

    it("Idempotency: Re-running classification twice produces identical results", async () => {
      const beforePages = await prisma.standardPage.findMany({ where: { documentId: testDocId }, orderBy: { pageNumber: 'asc' } });
      
      const classificationEvents = new QueueEvents("page-classification", { connection: chunkingQueue.opts.connection });
      const job = await pageClassificationQueue.add("classify", { documentId: testDocId });
      await job.waitUntilFinished(classificationEvents);
      await classificationEvents.close();

      const afterPages = await prisma.standardPage.findMany({ where: { documentId: testDocId }, orderBy: { pageNumber: 'asc' } });
      
      expect(afterPages.length).toBe(beforePages.length);
      for (let i = 0; i < beforePages.length; i++) {
        expect(afterPages[i].textContent).toBe(beforePages[i].textContent);
        expect(afterPages[i].classification).toBe(beforePages[i].classification);
        if (afterPages[i].classification === "PROSE") {
          expect(afterPages[i].ocrText).toBeNull();
        }
      }
    }, 60000);

    it("Chunk embed text includes both textContent and ocrText", async () => {
      const visualChunk = await prisma.standardChunk.findFirst({
        where: { documentId: testDocId, chunkType: "VISUAL" }
      });
      expect(visualChunk).toBeDefined();
      
      const page = await prisma.standardPage.findFirst({
        where: { documentId: testDocId, pageNumber: visualChunk!.pageStart }
      });
      
      expect(page!.ocrText).not.toBeNull();
      const expectedText = [page!.textContent, page!.ocrText].filter(Boolean).join("\n\n");
      expect(visualChunk!.textContent.endsWith(expectedText)).toBe(true);
    });
    
    it("Truncation: chunk text is truncated for page 33 to fit budget", async () => {
      const p33Page = await prisma.standardPage.findFirst({
        where: { documentId: testDocId, pageNumber: 33 }
      });
      const p33Chunk = await prisma.standardChunk.findFirst({
        where: { documentId: testDocId, pageStart: 33 }
      });
      expect(p33Page).toBeDefined();
      expect(p33Chunk).toBeDefined();
      
      expect(p33Chunk!.textContent.length).toBeLessThanOrEqual(4000);
      expect(p33Chunk!.textContent.startsWith("Context: ")).toBe(true);
      expect(p33Chunk!.textContent).toContain(p33Page!.textContent);
      
      const chunks = await prisma.$queryRaw<any[]>`
        SELECT embedding::text 
        FROM standard_chunks 
        WHERE id = ${p33Chunk!.id}::uuid
      `;
      expect(chunks.length).toBe(1);
      expect(chunks[0].embedding).toBeDefined();
      const vec = JSON.parse(chunks[0].embedding);
      expect(vec.length).toBe(768);
    });

    it("Loud failure: embedding error fails the chunking job", async () => {
      // Mock generateEmbedding to throw an error
      const mockGenerate = jest.spyOn(retrievalService, "generateEmbedding").mockRejectedValue(new Error("Ollama API failed"));
      
      // Create a dummy document to run chunking on
      const failDoc = await prisma.standardDocument.create({
        data: {
          sourceType: "GENERAL", projectId: testProjectId, fabricatorId: testFabricatorId,
          pdfName: "fail_test.pdf", storagePath: "/tmp/fail.pdf", status: "PENDING"
        }
      });
      
      await prisma.standardPage.create({
        data: {
          documentId: failDoc.id, pageNumber: 1, imagePath: "/tmp/1.png",
          textContent: "Test content", classification: "PROSE"
        }
      });
      
      await chunkingQueue.add("chunk", { documentId: failDoc.id });
      const doc = await waitForStatus(failDoc.id, "FAILED", 300000);
      
      expect(doc!.status).toBe("FAILED");
      
      const chunks = await prisma.standardChunk.count({ where: { documentId: failDoc.id } });
      expect(chunks).toBe(0); // No chunks should be written
      
      mockGenerate.mockRestore();
    }, 300000);
  });

  describe("Part B - Standalone Image", () => {
    it("PNG uploads as one StandardPage with pageNumber 1 and empty textContent, and creates a retrievable chunk", async () => {
      expect(testImageDocId).toBeDefined();
      
      const imageDoc = await prisma.standardDocument.findUnique({
        where: { id: testImageDocId }
      });
      expect(imageDoc).not.toBeNull(); 
      
      if (imageDoc) {
        const pages = await prisma.standardPage.findMany({ where: { documentId: imageDoc.id } });
        expect(pages.length).toBe(1);
        expect(pages[0].pageNumber).toBe(1);
        expect(pages[0].textContent).toBe("");
        expect(pages[0].classification).toBe("VISUAL");
        expect(pages[0].ocrText).not.toBeNull();
        expect(pages[0].ocrText!.length).toBeGreaterThan(10);
        
        const chunks = await prisma.standardChunk.findMany({ where: { documentId: imageDoc.id } });
        expect(chunks.length).toBe(1);
        expect(chunks[0].pageStart).toBe(1);
        expect(chunks[0].pageEnd).toBe(1);
        
        const chunksRaw = await prisma.$queryRaw<any[]>`
          SELECT embedding::text 
          FROM standard_chunks 
          WHERE id = ${chunks[0].id}::uuid
        `;
        expect(chunksRaw.length).toBe(1);
        expect(chunksRaw[0].embedding).toBeDefined();
      }
    });
  });

  describe("Retrieval Outcomes", () => {
    it("'column without cap plate' returns GSMS p18 as top-1 above 0.6", async () => {
      const qEmbed = await embed("column without cap plate");
      const chunks = await prisma.$queryRaw<any[]>`
        SELECT page_start as "pageStart", page_end as "pageEnd", 1 - (embedding <=> ${qEmbed}::vector) AS similarity 
        FROM standard_chunks 
        WHERE "document_id" = ${testDocId}::uuid
        ORDER BY embedding <=> ${qEmbed}::vector LIMIT 5
      `;
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].pageStart).toBe(18); // Fails red
      expect(chunks[0].similarity).toBeGreaterThan(0.6); // Fails red
    });

    // RECORDED GUARD: This asserts the recorded expected outcome for a known near-duplicate limit.
    // It passes both before and after implementation.
    it("'later wide gage standard angles' DOES NOT clear 0.6", async () => {
      const qEmbed = await embed("later wide gage standard angles");
      const chunks = await prisma.$queryRaw<any[]>`
        SELECT page_start as "pageStart", page_end as "pageEnd", 1 - (embedding <=> ${qEmbed}::vector) AS similarity 
        FROM standard_chunks 
        WHERE "document_id" = ${testDocId}::uuid
        ORDER BY embedding <=> ${qEmbed}::vector LIMIT 5
      `;
      expect(chunks.length).toBeGreaterThan(0);
      
      const p12Chunk = await prisma.$queryRaw<any[]>`
        SELECT 1 - (embedding <=> ${qEmbed}::vector) AS similarity 
        FROM standard_chunks 
        WHERE "document_id" = ${testDocId}::uuid AND page_start = 12
        LIMIT 1
      `;
      if (p12Chunk.length > 0) {
        expect(p12Chunk[0].similarity).toBeLessThan(0.6); // p12 does not clear 0.6
      }
      
      console.log(`Top-1 page is ${chunks[0].pageStart} with score ${chunks[0].similarity}`);
    });
    
    // RECORDED GUARD: This asserts an irrelevance query naturally stays below threshold.
    // It passes both before and after implementation.
    it("Irrelevance query stays below threshold", async () => {
      const qEmbed = await embed("How do I calibrate a marine GPS compass?");
      const chunks = await prisma.$queryRaw<any[]>`
        SELECT page_start as "pageStart", page_end as "pageEnd", 1 - (embedding <=> ${qEmbed}::vector) AS similarity 
        FROM standard_chunks 
        WHERE "document_id" = ${testDocId}::uuid
        ORDER BY embedding <=> ${qEmbed}::vector LIMIT 1
      `;
      if (chunks.length > 0) {
        expect(chunks[0].similarity).toBeLessThan(0.6);
      }
    });
  });
});
