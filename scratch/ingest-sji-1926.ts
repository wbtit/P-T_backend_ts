import prisma from "../src/config/database/client";
import { ingestDocument } from "../src/modules/standards/jobs/manifestIngestion";

const PDF_PATH = "/home/gpuserver1/P-T_backend_ts/benchmark-source/Joist & Hilti/JOIST/steel joists. - 1926.pdf";
const FAMILY_ID = "SJI-SPT-1926";

async function main() {
  // SJI joist span tables, 1926 edition, preserved via a 2017 OSHA website
  // print (the PDF itself is a Chrome print of an OSHA page hosting the
  // table). Publisher is SJI (span table content), source wrapper OSHA.
  // Existing convention: SJI-SPEC-43 (43rd ed. spec) -> SJI-SPT-1926.
  const existing = await prisma.standardFamily.findUnique({ where: { id: FAMILY_ID } });
  if (!existing) {
    await prisma.standardFamily.create({
      data: { id: FAMILY_ID, familyCode: "SJI-SPT", edition: "1926", isDefault: false },
    });
    console.log("created family " + FAMILY_ID);
  } else {
    console.log("family " + FAMILY_ID + " already exists, reusing");
  }

  const doc = await prisma.standardDocument.create({
    data: {
      sourceType: "GENERAL",
      pdfName: "steel joists. - 1926.pdf",
      storagePath: PDF_PATH,
      documentFamilyId: FAMILY_ID,
    },
  });
  console.log("created document " + doc.id + " status=" + doc.status);

  const report = await ingestDocument({
    documentId: doc.id,
    pdfPath: PDF_PATH,
    manifestDir: "/tmp/opencode/sj1926_dryrun",
    sourceType: "GENERAL",
    documentFamilyId: FAMILY_ID,
    edition: "1926",
    commit: true,
    skipExtraction: true,
  });
  console.log(JSON.stringify({ committed: report.committed, pages: report.pages, chunks: report.chunks, byType: report.byType, written: report.written }));
  console.log("\ndocumentId=" + doc.id);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
