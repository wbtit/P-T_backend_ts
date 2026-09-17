import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const id = process.argv[2];
if (!id) { console.error("usage: mark_old_superseded.ts <documentId>"); process.exit(1); }
(async () => {
  const before = await prisma.standardDocument.findUnique({ where: { id }, select: { id: true, status: true, pdfName: true } });
  console.log("before:", JSON.stringify(before));
  if (before?.status !== "PENDING") {
    console.log("SKIP: not PENDING, refusing to touch (expected PENDING dangling doc only)");
    await prisma.$disconnect();
    process.exit(1);
  }
  const updated = await prisma.standardDocument.update({
    where: { id },
    data: { status: "SUPERSEDED" },
    select: { id: true, status: true, pdfName: true },
  });
  console.log("after:", JSON.stringify(updated));
  await prisma.$disconnect();
})();
