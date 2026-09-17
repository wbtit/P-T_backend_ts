import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const id = "9b00e2b4-2723-4b81-a704-9173f8801c97";
  const answers = await prisma.standardChatAnswer.findMany({ where: { pinnedDocumentId: id } });
  console.log("chat_answers referencing it:", answers.length);
  if (answers.length === 0) {
    const before = await prisma.standardDocument.count();
    const d = await prisma.standardDocument.delete({ where: { id } });
    console.log("deleted:", d.id, d.pdfName);
    await prisma.standardFamily.delete({ where: { id: "ISOLATION-TEST-FAB-A" } });
    console.log("deleted family: ISOLATION-TEST-FAB-A");
    const after = await prisma.standardDocument.count();
    console.log(`standard_documents count: ${before} -> ${after}`);
  }
  await prisma.$disconnect();
})();
