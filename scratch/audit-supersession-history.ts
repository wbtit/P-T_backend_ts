import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  const superseded = await prisma.standardDocument.findMany({
    where: { status: "SUPERSEDED" },
    select: {
      id: true, pdfName: true, sourceType: true, documentFamilyId: true, fabricatorId: true, projectId: true,
      uploadedAt: true, storagePath: true,
      documentFamily: { select: { familyCode: true, edition: true } },
    },
    orderBy: { uploadedAt: "asc" },
  });

  console.log(`${superseded.length} SUPERSEDED documents total.\n`);

  for (const doc of superseded) {
    const whereClause: any = {
      status: "ACTIVE",
      sourceType: doc.sourceType,
      documentFamilyId: doc.documentFamilyId,
    };
    if (doc.sourceType === "FABRICATOR") {
      whereClause.fabricatorId = doc.fabricatorId;
      whereClause.projectId = null;
    } else if (doc.sourceType === "GENERAL") {
      whereClause.fabricatorId = null;
      whereClause.projectId = null;
    }

    const activeNow = await prisma.standardDocument.findMany({
      where: whereClause,
      select: { id: true, pdfName: true, storagePath: true, uploadedAt: true },
    });

    console.log("=".repeat(80));
    console.log(`SUPERSEDED: ${doc.id} | "${doc.pdfName}" | family=${doc.documentFamilyId} (${doc.documentFamily?.familyCode}/${doc.documentFamily?.edition}) | uploadedAt=${doc.uploadedAt.toISOString()}`);
    console.log(`  storagePath: ${doc.storagePath}`);
    if (activeNow.length === 0) {
      console.log(`  *** NO CURRENTLY-ACTIVE DOCUMENT IN THIS SCOPE -- family has ZERO active docs now ***`);
    }
    for (const a of activeNow) {
      const samePdfName = a.pdfName === doc.pdfName;
      console.log(`  -> currently ACTIVE in same scope: ${a.id} | "${a.pdfName}" | uploadedAt=${a.uploadedAt.toISOString()} | samePdfName=${samePdfName}`);
    }
  }

  await prisma.$disconnect();
})();
