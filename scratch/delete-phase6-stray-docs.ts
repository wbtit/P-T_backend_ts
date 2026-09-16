import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const IDS = ["0144dcf7-3a3c-49c4-bd48-090ceef31b00", "c0c90797-f54b-4265-bbd6-7a6611ff4abf"];
(async () => {
  const before = await prisma.standardDocument.count();
  for (const id of IDS) {
    const d = await prisma.standardDocument.delete({ where: { id } });
    console.log("deleted:", d.id, d.pdfName);
  }
  await prisma.standardFamily.delete({ where: { id: "PHASE6-UPLOAD-TEST" } });
  console.log("deleted family: PHASE6-UPLOAD-TEST");
  const after = await prisma.standardDocument.count();
  console.log(`standard_documents count: ${before} -> ${after}`);
  await prisma.$disconnect();
})();
