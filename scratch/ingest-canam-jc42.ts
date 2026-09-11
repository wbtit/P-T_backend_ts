import prisma from "../src/config/database/client";
import { ingestDocument } from "../src/modules/standards/jobs/manifestIngestion";

const PDF_PATH = "/home/gpuserver1/P-T_backend_ts/benchmark-source/Joist & Hilti/JOIST/canam-joist-catalog.pdf";
const FAMILY_ID = "CANAM-JC-42";

async function main() {
  // Family: one-per-publication convention (HILTI-ER-2001 precedent). canam
  // already has CANAM-SCD-2017 (a different publication - SCD); the joist
  // catalog is the 42nd-edition-SJI-spec catalog, familyCode CANAM-JC.
  const existing = await prisma.standardFamily.findUnique({ where: { id: FAMILY_ID } });
  if (!existing) {
    await prisma.standardFamily.create({
      data: { id: FAMILY_ID, familyCode: "CANAM-JC", edition: "42", isDefault: false },
    });
    console.log("created family " + FAMILY_ID);
  } else {
    console.log("family " + FAMILY_ID + " already exists, reusing");
  }

  const doc = await prisma.standardDocument.create({
    data: {
      sourceType: "GENERAL",
      pdfName: "canam-joist-catalog.pdf",
      storagePath: PDF_PATH,
      documentFamilyId: FAMILY_ID,
    },
  });
  console.log("created document " + doc.id + " status=" + doc.status);

  const report = await ingestDocument({
    documentId: doc.id,
    pdfPath: PDF_PATH,
    manifestDir: "/tmp/opencode/canam_dryrun",
    sourceType: "GENERAL",
    documentFamilyId: FAMILY_ID,
    edition: "42",
    commit: true,
    skipExtraction: true,
  });
  console.log(JSON.stringify(report, null, 2));
  console.log("\ndocumentId=" + doc.id);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
