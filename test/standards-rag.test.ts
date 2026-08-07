import prisma from "../src/config/database/client";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { standardsIngestionQueue, queueConnection as productionQueueConnection } from "../src/modules/standards/jobs/standardsIngestion";

// We'll use a local redis for tests.
const redisConnection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

describe("Phase 1: Standards RAG Foundation", () => {
  let fabricatorId: string;
  let projectId: string;
  let documentId: string;
  let messageId: string;
  let chunkId: string;
  let answerId: string;
  let createdById: string;
  let departmentId: string;
  let managerId: string;

  beforeAll(async () => {
    // 1. Setup dependent records in the core PM system tables
    
    // We need a department to satisfy Project relations
    const department = await prisma.department.create({
      data: { name: `Test Dept ${uuidv4()}` }
    });
    departmentId = department.id;

    // We need a user to satisfy Fabricator.createdBy and Project.managerID
    const user = await prisma.user.create({
      data: {
        username: `testuser_${uuidv4()}`,
        password: "password123",
        firstName: "Test",
        phone: "1234567890",
        role: "ADMIN"
      }
    });
    createdById = user.id;
    managerId = user.id;

    const fabricator = await prisma.fabricator.create({
      data: {
        fabName: `Test Fab ${uuidv4()}`,
        createdById
      }
    });
    fabricatorId = fabricator.id;

    const project = await prisma.project.create({
      data: {
        projectNumber: `TEST-${uuidv4().substring(0, 8)}`,
        name: `Test Project ${uuidv4()}`,
        description: "Test description",
        fabricatorID: fabricatorId,
        departmentID: departmentId,
        managerID: managerId
      }
    });
    projectId = project.id;
  });

  afterAll(async () => {
    // Cleanup everything
    // Note: Since standard documents are restricted, we have to clean them up in reverse order
    await prisma.standardChatAnswer.deleteMany({ where: { messageId } });
    await prisma.standardChatMessage.deleteMany({ where: { id: messageId } });
    await prisma.standardChunk.deleteMany({ where: { id: chunkId } });
    await prisma.standardDocument.deleteMany({ where: { id: documentId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.fabricator.deleteMany({ where: { id: fabricatorId } });
    await prisma.user.deleteMany({ where: { id: createdById } });
    await prisma.department.deleteMany({ where: { id: departmentId } });
    
    redisConnection.disconnect();
    await standardsIngestionQueue.close();
    productionQueueConnection.disconnect();
    await prisma.$disconnect();
  });

  it("should insert a StandardDocument correctly", async () => {
    const doc = await prisma.standardDocument.create({
      data: {
        sourceType: "FABRICATOR",
        fabricatorId,
        projectId,
        pdfName: "test_standards.pdf",
        storagePath: "/uploads/standards/test_standards.pdf"
      }
    });
    documentId = doc.id;
    expect(doc.id).toBeDefined();
  });

  it("should insert a StandardChunk with a vector and query it via <-> operator", async () => {
    chunkId = uuidv4();
    // 768-dimensional array mock
    const mockVector = Array(768).fill(0.1); 

    // We must use $executeRawUnsafe to insert the vector because Prisma ignores Unsupported types in .create()
    await prisma.$executeRawUnsafe(`
      INSERT INTO standard_chunks (id, document_id, chunk_type, page_start, page_end, text_content, embedding)
      VALUES ($1::uuid, $2::uuid, 'PROSE', 1, 1, 'test prose content', $3::vector)
    `, chunkId, documentId, JSON.stringify(mockVector));

    const result: any = await prisma.$queryRawUnsafe(`
      SELECT id, text_content, embedding <-> $1::vector AS distance 
      FROM standard_chunks 
      WHERE document_id = $2::uuid
      ORDER BY distance ASC 
      LIMIT 1
    `, JSON.stringify(mockVector), documentId);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(chunkId);
    expect(result[0].text_content).toBe("test prose content");
    expect(result[0].distance).toBeDefined();
  });

  it("should insert a StandardChatMessage and StandardChatAnswer", async () => {
    const message = await prisma.standardChatMessage.create({
      data: {
        projectId,
        queryText: "How do I do X?"
      }
    });
    messageId = message.id;

    const answer = await prisma.standardChatAnswer.create({
      data: {
        messageId,
        sourceType: "FABRICATOR",
        answerText: "You do X like this.",
        citationPdfName: "test_standards.pdf",
        citationPageStart: 1,
        citationPageEnd: 1,
        pinnedDocumentId: documentId,
        imagePaths: ["/uploads/images/page1.png"]
      }
    });
    answerId = answer.id;
    
    expect(answer.id).toBeDefined();
  });

  it("should restrict deletion of a Fabricator if a StandardDocument cites it", async () => {
    // Attempting to delete the fabricator should fail because of onDelete: Restrict
    await expect(
      prisma.fabricator.delete({ where: { id: fabricatorId } })
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("should restrict deletion of a Project if a StandardChatMessage cites it", async () => {
    await expect(
      prisma.project.delete({ where: { id: projectId } })
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("should restrict deletion of a StandardDocument if a StandardChatAnswer pins it", async () => {
    await expect(
      prisma.standardDocument.delete({ where: { id: documentId } })
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("should configure the production queue correctly", () => {
    expect(standardsIngestionQueue.name).toBe("standards-ingestion");
    expect(standardsIngestionQueue.opts.defaultJobOptions).toMatchObject({
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  });

  it("should enqueue and process a BullMQ job mechanically via a test worker", async () => {
    const queueName = `standards-ingestion-test-${uuidv4()}`;
    const testQueueConnection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    const testWorkerConnection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

    const testQueue = new Queue(queueName, { connection: testQueueConnection });
    
    const testWorker = new Worker(queueName, async (job) => {
      return true;
    }, { connection: testWorkerConnection });

    const jobProcessed = new Promise<string>((resolve) => {
      testWorker.on("completed", (job) => resolve(job.data.documentId));
    });

    await testQueue.add("ingest", { documentId });
    
    const processedJobId = await jobProcessed;
    expect(processedJobId).toBe(documentId);

    await testWorker.close();
    await testQueue.close();
    testWorkerConnection.quit();
    testQueueConnection.quit();
  });
});
