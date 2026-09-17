import prisma from "../src/config/database/client";
import { ingestDocument } from "../src/modules/standards/jobs/manifestIngestion";

const PDF_PATH = "/home/gpuserver1/P-T_backend_ts/benchmark-source/Joist & Hilti/JOIST/NASCC2007-SafeHandlePaper_15Jan07.pdf";
const FAMILY_ID = "NASCC-SHP-2007";

async function main() {
  // NASCC 2007 conference paper: "Safe Handling and Erection of Steel Joists
  // and Joist Girders" (Worthley/Pugh/Green, SJI). Publisher series NASCC,
  // one family per publication.
  const existing = await prisma.standardFamily.findUnique({ where: { id: FAMILY_ID } });
  if (!existing) {
    await prisma.standardFamily.create({
      data: { id: FAMILY_ID, familyCode: "NASCC-SHP", edition: "2007", isDefault: false },
    });
    console.log("created family " + FAMILY_ID);
  } else {
    console.log("family " + FAMILY_ID + " already exists, reusing");
  }

  const doc = await prisma.standardDocument.create({
    data: {
      sourceType: "GENERAL",
      pdfName: "NASCC2007-SafeHandlePaper_15Jan07.pdf",
      storagePath: PDF_PATH,
      documentFamilyId: FAMILY_ID,
    },
  });
  console.log("created document " + doc.id + " status=" + doc.status);

  const report = await ingestDocument({
    documentId: doc.id,
    pdfPath: PDF_PATH,
    manifestDir: "/tmp/opencode/nascc_dryrun",
    sourceType: "GENERAL",
    documentFamilyId: FAMILY_ID,
    edition: "2007",
    commit: true,
    skipExtraction: true,
  });
  console.log(JSON.stringify({ committed: report.committed, pages: report.pages, chunks: report.chunks, byType: report.byType, truncationRisk: report.truncationRisk, written: report.written }));
  console.log("\ndocumentId=" + doc.id);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
