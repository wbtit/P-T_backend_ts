import prisma from "../src/config/database/client";
import { ingestDocument } from "../src/modules/standards/jobs/manifestIngestion";

const PDF_PATH = "/home/gpuserver1/P-T_backend_ts/benchmark-source/Joist & Hilti/HILTI/Hilti_KB_2_ER_4627_2001_Feb.pdf";
const FAMILY_ID = "HILTI-ER-2001";

async function main() {
  // 1. Family: this is a different Hilti publication (ICBO evaluation report,
  // ER-4627, reissued Feb 2001) from the existing HILTI-PTG-2008 family
  // (2008 product Technical Guide) -- every real document ingested so far
  // has its own family, one-per-publication, not one-per-manufacturer.
  const existing = await prisma.standardFamily.findUnique({ where: { id: FAMILY_ID } });
  if (!existing) {
    await prisma.standardFamily.create({
      data: { id: FAMILY_ID, familyCode: "HILTI-ER", edition: "2001-02", isDefault: false },
    });
    console.log(`created family ${FAMILY_ID}`);
  } else {
    console.log(`family ${FAMILY_ID} already exists, reusing`);
  }

  // 2. Document row. status defaults to PENDING -- standing rule, not
  // activated here.
  const doc = await prisma.standardDocument.create({
    data: {
      sourceType: "GENERAL",
      pdfName: "Hilti_KB_2_ER_4627_2001_Feb.pdf",
      storagePath: PDF_PATH,
      documentFamilyId: FAMILY_ID,
    },
  });
  console.log(`created document ${doc.id} status=${doc.status}`);

  // 3. Ingest, reusing the exact manifest directory already verified this
  // session (skipExtraction) rather than re-running the extractor, so what
  // gets committed is byte-identical to what was inspected and reported.
  const report = await ingestDocument({
    documentId: doc.id,
    pdfPath: PDF_PATH,
    manifestDir: "/tmp/hilti_kb2_dryrun_amendment10_final",
    sourceType: "GENERAL",
    documentFamilyId: FAMILY_ID,
    edition: "2001-02",
    commit: true,
    skipExtraction: true,
  });
  console.log(JSON.stringify(report, null, 2));
  console.log(`\ndocumentId=${doc.id}`);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
