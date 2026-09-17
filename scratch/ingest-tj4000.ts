import prisma from "../src/config/database/client";
import { ingestDocument } from "../src/modules/standards/jobs/manifestIngestion";

const PDF_PATH = "/home/gpuserver1/P-T_backend_ts/benchmark-source/Joist & Hilti/JOIST/WODDEN JOIST/TJ-4000.pdf";
const FAMILY_ID = "TJI-SG-4000";

async function main() {
  // Weyerhaeuser TJI 110/210/230/360/560 Joists Specifier's Guide (guide code
  // TJ-4000, InDesign CS5). Publisher series TJI, publication = Specifier's
  // Guide TJ-4000. One family per publication.
  const existing = await prisma.standardFamily.findUnique({ where: { id: FAMILY_ID } });
  if (!existing) {
    await prisma.standardFamily.create({
      data: { id: FAMILY_ID, familyCode: "TJI-SG", edition: "4000", isDefault: false },
    });
    console.log("created family " + FAMILY_ID);
  } else {
    console.log("family " + FAMILY_ID + " already exists, reusing");
  }

  const doc = await prisma.standardDocument.create({
    data: {
      sourceType: "GENERAL",
      pdfName: "TJ-4000.pdf",
      storagePath: PDF_PATH,
      documentFamilyId: FAMILY_ID,
    },
  });
  console.log("created document " + doc.id + " status=" + doc.status);

  const report = await ingestDocument({
    documentId: doc.id,
    pdfPath: PDF_PATH,
    manifestDir: "/tmp/opencode/TJ4000_dryrun",
    sourceType: "GENERAL",
    documentFamilyId: FAMILY_ID,
    edition: "4000",
    commit: true,
    skipExtraction: true,
  });
  console.log(JSON.stringify({ committed: report.committed, pages: report.pages, chunks: report.chunks, byType: report.byType, headingMeta: report.headingMeta ? { noHeadingsDetected: (report.headingMeta as any).noHeadingsDetected, headingCoverageRatio: (report.headingMeta as any).headingCoverageRatio, outlineCoverageRatio: (report.headingMeta as any).outlineCoverageRatio } : null, written: report.written }));
  console.log("\ndocumentId=" + doc.id);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
