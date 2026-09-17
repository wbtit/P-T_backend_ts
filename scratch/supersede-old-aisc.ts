import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const before = await prisma.standardDocument.findMany({
    where: { documentFamilyId: "AISC-CM-14" },
    select: { id: true, pdfName: true, status: true, fabricatorId: true },
  });
  console.log("before:", JSON.stringify(before, null, 2));

  const updated = await prisma.standardDocument.update({
    where: { id: "c98019bf-dfbb-460f-971a-f003a0c53077" },
    data: { status: "SUPERSEDED" },
    select: { id: true, pdfName: true, status: true, fabricatorId: true },
  });
  console.log("updated old doc:", JSON.stringify(updated));

  const after = await prisma.standardDocument.findMany({
    where: { documentFamilyId: "AISC-CM-14" },
    select: { id: true, pdfName: true, status: true, fabricatorId: true },
  });
  console.log("after:", JSON.stringify(after, null, 2));

  await prisma.$disconnect();
})();
