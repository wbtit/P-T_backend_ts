import prisma from "../src/config/database/client";
import { resolveProjectDocumentIds, generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch } from "../src/modules/standards/services/retrievalTwoBranch";

const PAIRS = [
  { projectId: "1750b493-e567-4f19-a217-041dcafcb209", familyId: "AISC-CM-14", label: "P1/AISC" },
  { projectId: "09948b05-2045-4de5-aed5-82c9bb19ded0", familyId: "HILTI-PTG-2008", label: "P2/HiltiEA" },
  { projectId: "11cf6af3-337a-45f3-9604-474b30fffd1e", familyId: "CANAM-SCD-2017", label: "P3/ccd" },
  { projectId: "02dd55e5-0e09-4924-89bd-52334970ac12", familyId: "SJI-SPEC-43", label: "P4/SJI43" },
];
const FIXTURE_DOC_ID = "b12fe0ad-6961-4a00-9f93-b9241750206d";
const PROJECT_WITH_FABRICATOR = "5fa52afe-103f-4efc-afbd-23b7c6d2094d";
const PROJECT_WITHOUT_FABRICATOR = "3200a4a9-e657-49ac-8b4c-f39b8b00dc6b";

async function main() {
  const upd = await prisma.$executeRawUnsafe(
    `UPDATE project_standard_preferences SET source_type = 'GENERAL'::"StandardSourceType"
     WHERE project_id IN ('11cf6af3-337a-45f3-9604-474b30fffd1e','02dd55e5-0e09-4924-89bd-52334970ac12')`
  );
  console.log("preference rows corrected to GENERAL:", upd);

  const resolved: Record<string, string[]> = {};
  for (const p of PAIRS) {
    resolved[p.label] = await resolveProjectDocumentIds(p.projectId);
    console.log(p.label, "->", resolved[p.label]);
  }

  console.log("\n=== pairwise, all 6 pairs ===");
  let leaks = 0;
  for (let i = 0; i < PAIRS.length; i++) {
    for (let j = i + 1; j < PAIRS.length; j++) {
      const a = PAIRS[i], b = PAIRS[j];
      const overlap = resolved[a.label].filter((id) => resolved[b.label].includes(id));
      const ok = overlap.length === 0 && resolved[a.label].length > 0 && resolved[b.label].length > 0;
      if (overlap.length > 0) leaks++;
      console.log(`${a.label} (n=${resolved[a.label].length}) vs ${b.label} (n=${resolved[b.label].length}): overlap=${overlap.length} ${overlap.length === 0 ? "OK" : "LEAK!!"}`);
    }
  }

  console.log("\n=== actual tableBranch/proseBranch, real embedding ===");
  const vec = await generateEmbedding("steel joist standard specifications and dimensions");
  for (const p of PAIRS) {
    const ids = resolved[p.label];
    const [t, pr] = await Promise.all([
      tableBranch(vec, "steel joist standard specifications", ids, 5),
      proseBranch("steel joist standard specifications", vec, ids, 5),
    ]);
    const docIdsSeen = new Set([...t, ...pr].map((c) => c.documentId));
    const foreign = [...docIdsSeen].filter((id) => !ids.includes(id));
    console.log(`${p.label}: table=${t.length} prose=${pr.length} docIds=`, [...docIdsSeen], foreign.length ? "!! FOREIGN DOC SEEN" : "OK");
  }

  const withFab = await resolveProjectDocumentIds(PROJECT_WITH_FABRICATOR);
  const withoutFab = await resolveProjectDocumentIds(PROJECT_WITHOUT_FABRICATOR);
  const [tWith, prWith] = await Promise.all([
    tableBranch(vec, "steel joist standard specifications", withFab, 5),
    proseBranch("steel joist standard specifications", vec, withFab, 5),
  ]);
  const [tWithout, prWithout] = await Promise.all([
    tableBranch(vec, "steel joist standard specifications", withoutFab, 5),
    proseBranch("steel joist standard specifications", vec, withoutFab, 5),
  ]);
  console.log("\nNabers (WITH Cobb fabricator) sees fixture:", [...tWith, ...prWith].some((c) => c.documentId === FIXTURE_DOC_ID));
  console.log("Ray Steel (WITHOUT) sees fixture:", [...tWithout, ...prWithout].some((c) => c.documentId === FIXTURE_DOC_ID));

  console.log(leaks === 0 ? "\nRESULT: ZERO LEAKS" : `\nRESULT: ${leaks} LEAK(S)`);
  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
