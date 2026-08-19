import prisma from "../src/config/database/client";
import { generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { searchStandards } from "../src/modules/standards/services/retrievalService";

describe("Retrieval Preferences", () => {
  jest.setTimeout(300_000);
  let projExplicit: string;
  let projNone: string;
  let docFamily1: string;
  let docFamily2: string;

  beforeAll(async () => {
    // 1. Create two families
    const f1 = await prisma.standardFamily.create({
      data: { id: "TEST_FAM_1", familyCode: "TF1", edition: "1", isDefault: false }
    });
    docFamily1 = f1.id;

    const f2 = await prisma.standardFamily.create({
      data: { id: "TEST_FAM_2", familyCode: "TF2", edition: "1", isDefault: true } // THIS IS DEFAULT
    });
    docFamily2 = f2.id;

    // 2. Create projects
    // First, fetch relations if needed or just use random UUIDs if constraints permit.
    // Usually project requires manager, etc. Let's fetch one from DB.
    const manager = await prisma.user.findFirst();
    const dept = await prisma.department.findFirst();
    const fab = await prisma.fabricator.findFirst();
    
    if (!manager || !dept || !fab) {
        throw new Error("Missing required data to create test projects");
    }

    const p1 = await prisma.project.create({
      data: {
        name: "TestProj_Explicit_" + Date.now(),
        projectNumber: "TP_EXP_" + Date.now(),
        description: "Test",
        fabricatorID: fab.id,
        departmentID: dept.id,
        managerID: manager.id
      }
    });
    projExplicit = p1.id;

    const p2 = await prisma.project.create({
      data: {
        name: "TestProj_None_" + Date.now(),
        projectNumber: "TP_NONE_" + Date.now(),
        description: "Test",
        fabricatorID: fab.id,
        departmentID: dept.id,
        managerID: manager.id
      }
    });
    projNone = p2.id;

    // 3. Set preferences
    await prisma.projectStandardPreference.create({
      data: { projectId: projExplicit, standardFamilyId: docFamily1 }
    });

    // 4. Create active documents & chunks for both families
    const doc1 = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: docFamily1,
        pdfName: "fam1.pdf",
        storagePath: "dummy",
        status: "ACTIVE"
      }
    });

    const doc2 = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: docFamily2,
        pdfName: "fam2.pdf",
        storagePath: "dummy",
        status: "ACTIVE"
      }
    });

    // Create chunks with identical embeddings so both match perfectly
    const embedding = await generateEmbedding("test query exactly");
    
    const vectorStr = `[${embedding.join(",")}]`;
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO standard_chunks (id, document_id, chunk_type, page_start, page_end, text_content, source_type, embedding)
      VALUES 
      (gen_random_uuid(), $1::uuid, 'PROSE', 1, 1, 'test query exactly from fam 1', 'GENERAL', $3::vector),
      (gen_random_uuid(), $2::uuid, 'PROSE', 1, 1, 'test query exactly from fam 2', 'GENERAL', $3::vector)
    `, doc1.id, doc2.id, vectorStr);
  });

  afterAll(async () => {
    await prisma.standardChunk.deleteMany({
      where: { textContent: { startsWith: 'test query exactly' } }
    });
    await prisma.standardDocument.deleteMany({
      where: { documentFamilyId: { in: [docFamily1, docFamily2] } }
    });
    await prisma.projectStandardPreference.deleteMany({
      where: { projectId: { in: [projExplicit, projNone] } }
    });
    await prisma.standardFamily.deleteMany({
      where: { id: { in: [docFamily1, docFamily2] } }
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projExplicit, projNone] } }
    });
    await prisma.$disconnect();
  });

  it("searches only the explicitly preferred family when preference exists", async () => {
    const results = await searchStandards({
      query: "test query exactly",
      projectId: projExplicit
    });

    expect(results.general).not.toBeNull();
    expect(results.general!.length).toBe(1);
    expect(results.general![0].textContent).toContain("fam 1");
  });

  it("returns null results when no preference exists (short-circuit)", async () => {
    const results = await searchStandards({
      query: "test query exactly",
      projectId: projNone
    });

    expect(results.general).toBeNull();
  });
});
