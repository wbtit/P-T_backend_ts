import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const before = await prisma.standardDocument.count();
  const d = await prisma.standardDocument.delete({ where: { id: "96497e95-ce71-4b35-8582-bb701b23b06b" } });
  console.log("deleted:", d.id, d.pdfName);
  await prisma.standardFamily.delete({ where: { id: "FAB-PATH-TEST-COBB" } });
  console.log("deleted family: FAB-PATH-TEST-COBB");
  const after = await prisma.standardDocument.count();
  console.log(`standard_documents count: ${before} -> ${after}`);
  await prisma.$disconnect();
})();
