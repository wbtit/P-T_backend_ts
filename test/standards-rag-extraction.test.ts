import prisma from "../src/config/database/client";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { standardsIngestionQueue, standardsIngestionWorker, startStandardsIngestionWorker, queueConnection as productionQueueConnection, workerConnection as productionWorkerConnection } from "../src/modules/standards/jobs/standardsIngestion";
import { pageClassificationQueue, pageClassificationWorker, startPageClassificationWorker, classificationWorkerConnection, classificationQueueConnection } from "../src/modules/standards/jobs/pageClassification";

describe("Phase 2: PDF Extraction Pipeline", () => {
  let fabricatorId: string;
  let documentId: string;
  let corruptedDocumentId: string;

  const validPdfPath = path.resolve(__dirname, "fixtures/marvin-metals-standards.pdf");
  const corruptedPdfPath = path.resolve(__dirname, "fixtures/corrupted-marvin.pdf");

  beforeAll(async () => {
    // Ensure test fixtures exist
    if (!fs.existsSync(validPdfPath)) {
      throw new Error(`Fixture not found: ${validPdfPath}`);
    }

    // Create a deliberately corrupted PDF by truncating the valid one
    const validBuffer = fs.readFileSync(validPdfPath);
    fs.writeFileSync(corruptedPdfPath, validBuffer.slice(0, 1024)); // Just 1KB of the header

    // Set up standard test entities
    const fabricator = await prisma.fabricator.create({
      data: {
        fabName: `Marvin Metals Test ${uuidv4()}`,
        createdById: (await prisma.user.findFirst())?.id || (await prisma.user.create({
          data: { username: `test_${uuidv4()}`, firstName: "Test", phone: "1234567890", password: "pwd", role: "ADMIN" }
        })).id
      }
    });
    fabricatorId = fabricator.id;

    startStandardsIngestionWorker();
    startPageClassificationWorker();

    // Create valid document record
    const validDoc = await prisma.standardDocument.create({
      data: {
        sourceType: "FABRICATOR",
        fabricatorId,
        pdfName: "marvin-metals-standards.pdf",
        storagePath: validPdfPath
      }
    });
    documentId = validDoc.id;

    // Create corrupted document record
    const corruptedDoc = await prisma.standardDocument.create({
      data: {
        sourceType: "FABRICATOR",
        fabricatorId,
        pdfName: "corrupted-marvin.pdf",
        storagePath: corruptedPdfPath
      }
    });
    corruptedDocumentId = corruptedDoc.id;
  });

  afterAll(async () => {
    // Cleanup DB
    await prisma.standardPage.deleteMany({ where: { documentId: { in: [documentId, corruptedDocumentId] } } });
    await prisma.standardDocument.deleteMany({ where: { id: { in: [documentId, corruptedDocumentId] } } });
    await prisma.fabricator.deleteMany({ where: { id: fabricatorId } });
    
    // Cleanup files
    if (fs.existsSync(corruptedPdfPath)) {
      fs.unlinkSync(corruptedPdfPath);
    }
    const uploadBaseDir = path.resolve(process.cwd(), "uploads/standards/FABRICATOR");
    if (fs.existsSync(path.join(uploadBaseDir, documentId))) {
      fs.rmSync(path.join(uploadBaseDir, documentId), { recursive: true, force: true });
    }
    
    
    await standardsIngestionWorker?.close();
    await standardsIngestionQueue.close();
    productionWorkerConnection?.disconnect();
    productionQueueConnection.disconnect();
    
    await pageClassificationWorker?.close();
    await pageClassificationQueue.close();
    classificationWorkerConnection?.disconnect();
    classificationQueueConnection.disconnect();
    
    await prisma.$disconnect();
  });

  it("should fail atomically when processing a corrupted PDF, leaving 0 pages in DB", async () => {
    // Send the corrupted document job
    const jobProcessed = new Promise<void>((resolve, reject) => {
      // Listen on the global queue connection or the specific worker
      const onFailed = (job: any) => {
        if (job?.data?.documentId === corruptedDocumentId) {
          standardsIngestionWorker?.removeListener("failed", onFailed);
          resolve();
        }
      };
      standardsIngestionWorker?.on("failed", onFailed);
      
      const onCompleted = (job: any) => {
        if (job?.data?.documentId === corruptedDocumentId) {
          standardsIngestionWorker?.removeListener("completed", onCompleted);
          reject(new Error("Job succeeded but should have failed"));
        }
      };
      standardsIngestionWorker?.on("completed", onCompleted);
    });

    await standardsIngestionQueue.add("ingest", { documentId: corruptedDocumentId }, { attempts: 1 });
    await jobProcessed;

    // Verify atomic failure (no partial pages stored)
    const pages = await prisma.standardPage.findMany({ where: { documentId: corruptedDocumentId } });
    expect(pages.length).toBe(0);
  }, 15000);

  it("should process the valid 89-page PDF successfully, verifying the full extraction-through-classification chain", async () => {
    const jobProcessed = new Promise<void>((resolve) => {
      const onCompleted = (job: any) => {
        if (job?.data?.documentId === documentId) {
          standardsIngestionWorker?.removeListener("completed", onCompleted);
          resolve();
        }
      };
      standardsIngestionWorker?.on("completed", onCompleted);
    });

    await standardsIngestionQueue.add("ingest", { documentId });
    await jobProcessed;

    // 1. Verify correct page count is detected and stored
    const pages = await prisma.standardPage.findMany({
      where: { documentId },
      orderBy: { pageNumber: 'asc' }
    });
    
    expect(pages.length).toBe(89);

    // 2. Spot-check extracted text on known pages
    const page5 = pages.find(p => p.pageNumber === 5);
    expect(page5).toBeDefined();
    expect(page5?.textContent.toUpperCase()).toContain("VARIOUS ITEMS");

    const page8 = pages.find(p => p.pageNumber === 8);
    expect(page8).toBeDefined();
    expect(page8?.textContent.toUpperCase()).toContain("STANDARD CLIP ANGLES");

    // Check empty/near-empty text content is preserved as valid (not omitted)
    const sparsePages = pages.filter(p => p.textContent.trim().length < 50);
    expect(sparsePages.length).toBeGreaterThan(0);

    // 3. Image files exist on disk and are non-empty for every page
    for (const page of pages) {
      expect(page.imagePath).toBeTruthy();
      const absoluteImagePath = path.join(process.cwd(), page.imagePath.startsWith('/') ? page.imagePath.slice(1) : page.imagePath);
      expect(fs.existsSync(absoluteImagePath)).toBe(true);
      
      const stat = fs.statSync(absoluteImagePath);
      expect(stat.size).toBeGreaterThan(100); // Image file should be non-empty
    }
    // Wait for the classification worker to finish processing the document
    const classificationProcessed = new Promise<void>((resolve) => {
      const onClassified = (job: any) => {
        if (job?.data?.documentId === documentId) {
          pageClassificationWorker?.removeListener("completed", onClassified);
          resolve();
        }
      };
      pageClassificationWorker?.on("completed", onClassified);
    });
    
    await classificationProcessed;
    
    // 4. Verify pages are classified successfully (End-to-End verification)
    const classifiedPages = await prisma.standardPage.findMany({
      where: { documentId }
    });
    
    expect(classifiedPages.length).toBe(89);
    for (const page of classifiedPages) {
      expect(page.classification).not.toBeNull();
    }
    
    const prosePages = classifiedPages.filter(p => p.classification === "PROSE");
    const visualPages = classifiedPages.filter(p => p.classification === "VISUAL");
    
    expect(prosePages.length).toBeGreaterThan(0);
    expect(visualPages.length).toBeGreaterThan(0);

  }, 120000); // Allow up to 2 mins for rendering and classification
});
