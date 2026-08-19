import prisma from "../src/config/database/client";
import { StandardsVersioningService } from "../src/modules/standards/services/versioningService";
import { StandardsController } from "../src/modules/standards/controllers/standards.controller";
import fs from "fs";
import path from "path";

describe("Standard Document Family Scoping", () => {
  let dummyPdfPath: string;

  beforeAll(async () => {
    dummyPdfPath = path.join("/tmp", `dummy-${Date.now()}.pdf`);
    fs.writeFileSync(dummyPdfPath, "dummy content");
    await prisma.standardFamily.createMany({
      data: [
        { id: "TEST_FAMILY_1", familyCode: "TF1", edition: "1", isDefault: false },
        { id: "TEST_FAMILY_2", familyCode: "TF2", edition: "1", isDefault: false },
        { id: "TEST_FAMILY_3", familyCode: "TF3", edition: "1", isDefault: false },
        { id: "TEST_FAMILY_4", familyCode: "TF4", edition: "1", isDefault: false }
      ],
      skipDuplicates: true
    });
  });

  afterAll(async () => {
    // cleanup
    await prisma.standardDocument.deleteMany({
      where: { documentFamilyId: { in: ["TEST_FAMILY_1", "TEST_FAMILY_2", "TEST_FAMILY_3", "TEST_FAMILY_4"] } }
    });
    await prisma.standardFamily.deleteMany({
      where: { id: { in: ["TEST_FAMILY_1", "TEST_FAMILY_2", "TEST_FAMILY_3", "TEST_FAMILY_4"] } }
    });
    await prisma.standardDocument.deleteMany({
      where: { pdfName: { startsWith: "fam" } }
    });
    if (fs.existsSync(dummyPdfPath)) {
      fs.unlinkSync(dummyPdfPath);
    }
    await prisma.$disconnect();
  });

  it("rejects GENERAL upload if documentFamilyId is missing", async () => {
    // Note: This calls the controller directly with a mocked req/res, so it verifies
    // validation shape but bypasses the real route, middleware, and multer.
    const controller = new StandardsController();
    const req = {
      body: { sourceType: "GENERAL" },
      file: { path: dummyPdfPath, originalname: "dummy.pdf" }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await controller.uploadStandard(req as any, res as any);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "documentFamilyId is required for GENERAL sourceType" });
  });

  it("leaves existing GENERAL documents ACTIVE when a new family is uploaded", async () => {
    const versioningService = new StandardsVersioningService();

    // Create first active document
    const doc1 = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: "TEST_FAMILY_1",
        pdfName: "fam1_v1.pdf",
        storagePath: dummyPdfPath,
        status: "ACTIVE"
      }
    });

    // Create second document in a different family and activate it
    const doc2 = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: "TEST_FAMILY_2",
        pdfName: "fam2_v1.pdf",
        storagePath: dummyPdfPath,
        status: "PENDING"
      }
    });
    await versioningService.activateStandardDocument(doc2.id);

    // Verify both are active
    const check1 = await prisma.standardDocument.findUnique({ where: { id: doc1.id } });
    const check2 = await prisma.standardDocument.findUnique({ where: { id: doc2.id } });
    expect(check1?.status).toBe("ACTIVE");
    expect(check2?.status).toBe("ACTIVE");
  });

  it("supersedes only the same family's prior version when a new version is uploaded", async () => {
    const versioningService = new StandardsVersioningService();

    // Self-contained: Create doc3 in TEST_FAMILY_3 and doc4 in TEST_FAMILY_4
    const doc3 = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: "TEST_FAMILY_3",
        pdfName: "fam3_v1.pdf",
        storagePath: dummyPdfPath,
        status: "ACTIVE"
      }
    });
    const doc4 = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: "TEST_FAMILY_4",
        pdfName: "fam4_v1.pdf",
        storagePath: dummyPdfPath,
        status: "ACTIVE"
      }
    });
    
    // Create new version of TEST_FAMILY_3
    const doc3_v2 = await prisma.standardDocument.create({
      data: {
        sourceType: "GENERAL",
        documentFamilyId: "TEST_FAMILY_3",
        pdfName: "fam3_v2.pdf",
        storagePath: dummyPdfPath,
        status: "PENDING"
      }
    });

    await versioningService.activateStandardDocument(doc3_v2.id);

    // Verify doc3 is SUPERSEDED, doc3_v2 is ACTIVE, doc4 remains ACTIVE
    const check3_v1 = await prisma.standardDocument.findUnique({ where: { id: doc3.id } });
    const check3_v2 = await prisma.standardDocument.findUnique({ where: { id: doc3_v2.id } });
    const check4 = await prisma.standardDocument.findUnique({ where: { id: doc4.id } });

    expect(check3_v1?.status).toBe("SUPERSEDED");
    expect(check3_v2?.status).toBe("ACTIVE");
    expect(check4?.status).toBe("ACTIVE");

    // cleanup
    await prisma.standardDocument.deleteMany({
      where: { documentFamilyId: { in: ["TEST_FAMILY_3", "TEST_FAMILY_4"] } }
    });
  });

  it("FABRICATOR upload supersedes only prior active doc for that same project and fabricator", async () => {
    const versioningService = new StandardsVersioningService();

    // Dynamically fetch foreign keys to create isolated dummy projects
    const fab = await prisma.fabricator.findFirst({ select: { id: true } });
    const dept = await prisma.department.findFirst({ select: { id: true } });
    const mgr = await prisma.user.findFirst({ select: { id: true } });
    if (!fab || !dept || !mgr) {
      console.warn("Skipping test: Missing required relations in DB to create test projects.");
      return;
    }

    const testSuffix = Date.now().toString();
    const proj1 = await prisma.project.create({
      data: {
        name: `TEST_PROJ_1_${testSuffix}`,
        projectNumber: `TP1_${testSuffix}`,
        description: "Test",
        fabricatorID: fab.id,
        departmentID: dept.id,
        managerID: mgr.id
      }
    });

    const proj2 = await prisma.project.create({
      data: {
        name: `TEST_PROJ_2_${testSuffix}`,
        projectNumber: `TP2_${testSuffix}`,
        description: "Test",
        fabricatorID: fab.id,
        departmentID: dept.id,
        managerID: mgr.id
      }
    });

    // ACTIVE doc for Proj 1
    const fabDocProj1 = await prisma.standardDocument.create({
      data: {
        sourceType: "FABRICATOR",
        projectId: proj1.id,
        fabricatorId: fab.id,
        pdfName: "fab_p1_v1.pdf",
        storagePath: dummyPdfPath,
        status: "ACTIVE"
      }
    });

    // ACTIVE doc for Proj 2
    const fabDocProj2 = await prisma.standardDocument.create({
      data: {
        sourceType: "FABRICATOR",
        projectId: proj2.id,
        fabricatorId: fab.id,
        pdfName: "fab_p2_v1.pdf",
        storagePath: dummyPdfPath,
        status: "ACTIVE"
      }
    });

    // PENDING doc for Proj 1 (new version)
    const fabDocProj1_v2 = await prisma.standardDocument.create({
      data: {
        sourceType: "FABRICATOR",
        projectId: proj1.id,
        fabricatorId: fab.id,
        pdfName: "fab_p1_v2.pdf",
        storagePath: dummyPdfPath,
        status: "PENDING"
      }
    });

    await versioningService.activateStandardDocument(fabDocProj1_v2.id);

    // Assert
    const checkP1_v1 = await prisma.standardDocument.findUnique({ where: { id: fabDocProj1.id } });
    const checkP1_v2 = await prisma.standardDocument.findUnique({ where: { id: fabDocProj1_v2.id } });
    const checkP2_v1 = await prisma.standardDocument.findUnique({ where: { id: fabDocProj2.id } });

    expect(checkP1_v1?.status).toBe("SUPERSEDED");
    expect(checkP1_v2?.status).toBe("ACTIVE");
    expect(checkP2_v1?.status).toBe("ACTIVE"); // Should be untouched

    // cleanup
    await prisma.standardDocument.deleteMany({
      where: { id: { in: [fabDocProj1.id, fabDocProj2.id, fabDocProj1_v2.id] } }
    });
    await prisma.project.deleteMany({
      where: { id: { in: [proj1.id, proj2.id] } }
    });
  });
});
