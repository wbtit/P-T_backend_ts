import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const docs = await prisma.standardDocument.findMany({
    where: { documentFamilyId: "TJI-SG-4000" },
    select: { id: true, pdfName: true, status: true },
  });
  console.log(JSON.stringify(docs, null, 2));
  await prisma.$disconnect();
})();
