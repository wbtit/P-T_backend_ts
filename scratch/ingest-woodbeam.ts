import prisma from "../src/config/database/client";
import { ingestDocument } from "../src/modules/standards/jobs/manifestIngestion";

const PDF_PATH = "/home/gpuserver1/P-T_backend_ts/benchmark-source/Joist & Hilti/JOIST/WODDEN JOIST/Wood-Beam-Joists-Specs.pdf";
const FAMILY_ID = "WIB-JS-GPI";

async function main() {
  // "Wood I Beam Joists GPI Series (LVL Flanges) / WI Series (Lumber Flanges)"
  // specifier sheets. No PDF metadata (no title/creator - scanned-era export).
  // Publisher brand "Wood I Beam"; publication = GPI/WI series joist specs.
  const existing = await prisma.standardFamily.findUnique({ where: { id: FAMILY_ID } });
  if (!existing) {
    await prisma.standardFamily.create({
      data: { id: FAMILY_ID, familyCode: "WIB-JS", edition: "1", isDefault: false },
    });
    console.log("created family " + FAMILY_ID);
  } else {
    console.log("family " + FAMILY_ID + " already exists, reusing");
  }

  const doc = await prisma.standardDocument.create({
    data: {
      sourceType: "GENERAL",
      pdfName: "Wood-Beam-Joists-Specs.pdf",
      storagePath: PDF_PATH,
      documentFamilyId: FAMILY_ID,
    },
  });
  console.log("created document " + doc.id + " status=" + doc.status);

  const report = await ingestDocument({
    documentId: doc.id,
    pdfPath: PDF_PATH,
    manifestDir: "/tmp/opencode/woodbeam_dryrun",
    sourceType: "GENERAL",
    documentFamilyId: FAMILY_ID,
    edition: "1",
    commit: true,
    skipExtraction: true,
  });
  console.log(JSON.stringify({ committed: report.committed, pages: report.pages, chunks: report.chunks, byType: report.byType, written: report.written }));
  console.log("\ndocumentId=" + doc.id);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
