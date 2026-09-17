import { ingestDocument } from "../src/modules/standards/jobs/manifestIngestion";

const PDF_PATH = "/home/gpuserver1/P-T_backend_ts/benchmark-source/Joist & Hilti/HILTI/Hilti_KB_2_ER_4627_2001_Feb.pdf";
const DOC_ID = "17affb6d-7b66-44ef-8910-c658538c55f7";
const FAMILY_ID = "HILTI-ER-2001";

async function main() {
  const report = await ingestDocument({
    documentId: DOC_ID,
    pdfPath: PDF_PATH,
    manifestDir: "/tmp/hilti_kb2_dryrun_amendment10_final",
    sourceType: "GENERAL",
    documentFamilyId: FAMILY_ID,
    edition: "2001-02",
    commit: true,
    skipExtraction: true,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
