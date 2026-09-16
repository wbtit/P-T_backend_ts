import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DOC_IDS = ["6b2034bb-0eb6-4f6b-b7a3-45b1fc625c06", "53f2c7a7-1ee1-4f03-8ac8-37c7a885d8cb", "e76af258-f97b-4aef-84d4-c82d2e1d2066"];
(async () => {
  const before = await prisma.standardDocument.count();
  for (const id of DOC_IDS) {
    const deleted = await prisma.standardDocument.delete({ where: { id } });
    console.log("deleted:", deleted.id, deleted.pdfName);
  }
  await prisma.standardFamily.delete({ where: { id: "OPENAPI-DOC-EXAMPLE" } });
  console.log("deleted family: OPENAPI-DOC-EXAMPLE");
  const after = await prisma.standardDocument.count();
  console.log(`standard_documents count: ${before} -> ${after}`);
  await prisma.$disconnect();
})();
