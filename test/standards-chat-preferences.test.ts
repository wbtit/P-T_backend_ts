import { searchStandards } from "../src/modules/standards/services/retrievalService";
import { askStandards } from "../src/modules/standards/services/chatService";
import prisma from "../src/config/database/client";

describe("ChatService Preferences Handling", () => {
  let projNoPrefs: string;
  let projWithPrefsZeroMatch: string;
  let docFamily: string;

  beforeAll(async () => {
    const manager = await prisma.user.findFirst();
    const dept = await prisma.department.findFirst();
    const fab = await prisma.fabricator.findFirst();
    
    if (!manager || !dept || !fab) {
        throw new Error("Missing required data to create test projects");
    }

    const p1 = await prisma.project.create({
      data: {
        name: "TestProj_NoPrefs_" + Date.now(),
        projectNumber: "TP_NOPREFS_" + Date.now(),
        description: "Test",
        fabricatorID: fab.id,
        departmentID: dept.id,
        managerID: manager.id
      }
    });
    projNoPrefs = p1.id;

    const p2 = await prisma.project.create({
      data: {
        name: "TestProj_WithPrefs_" + Date.now(),
        projectNumber: "TP_WITHPREFS_" + Date.now(),
        description: "Test",
        fabricatorID: fab.id,
        departmentID: dept.id,
        managerID: manager.id
      }
    });
    projWithPrefsZeroMatch = p2.id;

    const f1 = await prisma.standardFamily.create({
      data: { id: "CHAT_TEST_FAM_" + Date.now(), familyCode: "CTF", edition: "1", isDefault: false }
    });
    docFamily = f1.id;

    await prisma.projectStandardPreference.create({
      data: {
        projectId: projWithPrefsZeroMatch,
        standardFamilyId: docFamily
      }
    });

    await prisma.standardDocument.createMany({
      data: [
        { id: "00000000-0000-4000-a000-000000000010", documentFamilyId: docFamily, pdfName: "fab1.pdf", status: "ACTIVE", sourceType: "FABRICATOR", projectId: projNoPrefs, storagePath: "/test1.pdf" },
        { id: "00000000-0000-4000-a000-000000000011", documentFamilyId: docFamily, pdfName: "fab2.pdf", status: "ACTIVE", sourceType: "FABRICATOR", projectId: projWithPrefsZeroMatch, storagePath: "/test2.pdf" }
      ],
      skipDuplicates: true
    });
  });

  afterAll(async () => {
    await prisma.standardChatAnswer.deleteMany({
      where: { message: { projectId: { in: [projNoPrefs, projWithPrefsZeroMatch] } } }
    });
    await prisma.standardChatMessage.deleteMany({
      where: { projectId: { in: [projNoPrefs, projWithPrefsZeroMatch] } }
    });
    await prisma.projectStandardPreference.deleteMany({
      where: { projectId: { in: [projNoPrefs, projWithPrefsZeroMatch] } }
    });
    await prisma.standardDocument.deleteMany({
      where: { projectId: { in: [projNoPrefs, projWithPrefsZeroMatch] } }
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projNoPrefs, projWithPrefsZeroMatch] } }
    });
    await prisma.$disconnect();
  });

  it("case (a): zero preferences produces no DB write and throws NO_PREFERENCES_SET", async () => {
    // Count DB messages before
    const beforeCount = await prisma.standardChatMessage.count({ where: { projectId: projNoPrefs } });

    await expect(askStandards(projNoPrefs, "test query")).rejects.toThrow("NO_PREFERENCES_SET");

    // Count DB messages after (should be identical, no orphan message)
    const afterCount = await prisma.standardChatMessage.count({ where: { projectId: projNoPrefs } });
    expect(afterCount).toBe(beforeCount);
  });

  it("case (b): has-preferences-zero-match produces a real persisted answer with a null pin", async () => {
    const result = await askStandards(projWithPrefsZeroMatch, "test query with no matches");

    expect(result.answers.length).toBe(2); // 1 GENERAL, 1 FABRICATOR
    const generalAnswer = result.answers.find(a => a.sourceType === "GENERAL");
    const fabricatorAnswer = result.answers.find(a => a.sourceType === "FABRICATOR");

    expect(generalAnswer).toBeDefined();
    expect(generalAnswer?.pinnedDocumentId).toBeNull();
    expect(generalAnswer?.answerText).toBe("Not covered by your selected standard families.");

    // Ensure Fabricator STILL pins its active document, as that logic shouldn't break
    expect(fabricatorAnswer).toBeDefined();
    expect(fabricatorAnswer?.pinnedDocumentId).not.toBeNull();
    expect(fabricatorAnswer?.answerText).toBe("Not covered by this standard.");
  });
});
