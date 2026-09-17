import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const IDS = ["0b4817db-e93e-4334-9ab8-d2b5fa91070d","f6d44063-047b-436a-a7c5-8824589baf3d","47213f34-9db0-4669-8a52-f01e90d3e78c","87d4bbd1-b743-4ab9-8246-1dcc60e49ef7"];
(async () => {
  const before = await prisma.standardDocument.count();
  for (const id of IDS) {
    const d = await prisma.standardDocument.delete({ where: { id } });
    console.log("deleted:", d.id, d.pdfName);
  }
  await prisma.standardFamily.delete({ where: { id: "SUPERSEDE-TEST" } });
  console.log("deleted family: SUPERSEDE-TEST");
  const after = await prisma.standardDocument.count();
  console.log(`standard_documents count: ${before} -> ${after}`);
  await prisma.$disconnect();
})();
