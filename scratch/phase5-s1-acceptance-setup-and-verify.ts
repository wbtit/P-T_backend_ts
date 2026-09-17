import prisma from "../src/config/database/client";
import { resolveProjectDocumentIds, generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch } from "../src/modules/standards/services/retrievalTwoBranch";

const GENERAL_PROJECT_PAIRS = [
  { projectId: "1750b493-e567-4f19-a217-041dcafcb209", familyId: "AISC-CM-14", sourceType: "GENERAL", label: "P1/AISC" },
  { projectId: "09948b05-2045-4de5-aed5-82c9bb19ded0", familyId: "HILTI-PTG-2008", sourceType: "GENERAL", label: "P2/HiltiEA" },
  { projectId: "11cf6af3-337a-45f3-9604-474b30fffd1e", familyId: "CANAM-SCD-2017", sourceType: "PROJECT", label: "P3/ccd" },
  { projectId: "02dd55e5-0e09-4924-89bd-52334970ac12", familyId: "SJI-SPEC-43", sourceType: "PROJECT", label: "P4/SJI43" },
];

const COBB_FABRICATOR_ID = "86fa8268-e4d7-4e67-b6ab-a155bac89da0";
const PROJECT_WITH_FABRICATOR = "5fa52afe-103f-4efc-afbd-23b7c6d2094d"; // Nabers Tennis Center
const PROJECT_WITHOUT_FABRICATOR = "3200a4a9-e657-49ac-8b4c-f39b8b00dc6b"; // Ray Steel Project
const PLANT_GAGES_CHUNK_ID = "9b23b879-6351-4d2e-8cfe-c9fdd1eef2bf";

async function main() {
  console.log("=== SETUP: inserting 4 preference rows ===");
  for (const p of GENERAL_PROJECT_PAIRS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO project_standard_preferences (id, project_id, standard_family_id, source_type)
       VALUES (gen_random_uuid(), $1::uuid, $2, $3::"StandardSourceType")`,
      p.projectId, p.familyId, p.sourceType
    );
    console.log(`inserted preference: ${p.label}`);
  }

  console.log("\n=== SETUP: creating FABRICATOR fixture document + 1 chunk ===");
  const newDocRows: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO standard_documents (
      id, source_type, fabricator_id, pdf_name, storage_path, status,
      document_family_id, total_pages, pages_processed, uploaded_at
    ) VALUES (
      gen_random_uuid(), 'FABRICATOR', $1::uuid,
      'TEST FIXTURE -- FABRICATOR isolation acceptance test (content copied from PLANT STANDARD GAGES-NMBS.pdf)',
      '__test_fixture__/fabricator-isolation-test.pdf',
      'ACTIVE', NULL, 2, 2, NOW()
    ) RETURNING id
  `, COBB_FABRICATOR_ID);
  const fixtureDocId = newDocRows[0].id;
  console.log("fixture document id:", fixtureDocId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO standard_chunks (
      id, document_id, chunk_type, page_start, page_end, text_content,
      source_type, project_id, fabricator_id, heading, document_family_id, edition,
      parent_chunk_id, row_group_index, reliability_reason, embedding, created_at
    )
    SELECT gen_random_uuid(), $2::uuid, chunk_type, page_start, page_end, text_content,
      'FABRICATOR', project_id, fabricator_id, heading, NULL, NULL,
      NULL, NULL, reliability_reason, embedding, NOW()
    FROM standard_chunks WHERE id = $1::uuid
  `, PLANT_GAGES_CHUNK_ID, fixtureDocId);
  console.log("fixture chunk inserted");

  console.log("\n=== VERIFY: resolveProjectDocumentIds() per project ===");
  const resolved: Record<string, string[]> = {};
  for (const p of GENERAL_PROJECT_PAIRS) {
    resolved[p.label] = await resolveProjectDocumentIds(p.projectId);
    console.log(p.label, "->", resolved[p.label]);
  }
  const withFab = await resolveProjectDocumentIds(PROJECT_WITH_FABRICATOR);
  const withoutFab = await resolveProjectDocumentIds(PROJECT_WITHOUT_FABRICATOR);
  console.log("Nabers (WITH Cobb fabricator) ->", withFab);
  console.log("Ray Steel (WITHOUT Cobb fabricator) ->", withoutFab);

  console.log("\n=== VERIFY: pairwise cross-leakage via resolveProjectDocumentIds, all C(4,2)=6 pairs ===");
  let leaks = 0;
  for (let i = 0; i < GENERAL_PROJECT_PAIRS.length; i++) {
    for (let j = i + 1; j < GENERAL_PROJECT_PAIRS.length; j++) {
      const a = GENERAL_PROJECT_PAIRS[i], b = GENERAL_PROJECT_PAIRS[j];
      const overlap = resolved[a.label].filter((id) => resolved[b.label].includes(id));
      const ok = overlap.length === 0;
      if (!ok) leaks++;
      console.log(`${a.label} vs ${b.label}: overlap=${overlap.length} ${ok ? "OK" : "LEAK!!"}`);
    }
  }
  console.log("FABRICATOR fixture leak check:", withFab.includes(fixtureDocId) ? "Nabers sees it (expected)" : "Nabers MISSING it (WRONG)",
    "|", withoutFab.includes(fixtureDocId) ? "Ray Steel sees it (WRONG)" : "Ray Steel correctly does not see it");

  console.log("\n=== VERIFY: actual tableBranch/proseBranch calls, real embedding ===");
  const vec = await generateEmbedding("steel joist standard specifications and dimensions");
  for (const p of GENERAL_PROJECT_PAIRS) {
    const ids = resolved[p.label];
    const [t, pr] = await Promise.all([
      tableBranch(vec, "steel joist standard specifications", ids, 5),
      proseBranch("steel joist standard specifications", vec, ids, 5),
    ]);
    const docIdsSeen = new Set([...t, ...pr].map((c) => c.documentId));
    console.log(`${p.label}: table=${t.length} prose=${pr.length} distinct documentIds seen=`, [...docIdsSeen]);
    if (docIdsSeen.size > 1 || (docIdsSeen.size === 1 && ![...docIdsSeen][0])) {
      console.log(`  !! ${p.label} saw more than its own scoped document(s)`);
    }
  }

  const [tWith, prWith] = await Promise.all([
    tableBranch(vec, "steel joist standard specifications", withFab, 5),
    proseBranch("steel joist standard specifications", vec, withFab, 5),
  ]);
  const [tWithout, prWithout] = await Promise.all([
    tableBranch(vec, "steel joist standard specifications", withoutFab, 5),
    proseBranch("steel joist standard specifications", vec, withoutFab, 5),
  ]);
  console.log("Nabers (WITH) actual query sees fixture doc:", [...tWith, ...prWith].some((c) => c.documentId === fixtureDocId));
  console.log("Ray Steel (WITHOUT) actual query sees fixture doc:", [...tWithout, ...prWithout].some((c) => c.documentId === fixtureDocId));

  console.log("\nFIXTURE_DOC_ID=", fixtureDocId);
  console.log(leaks === 0 ? "\nRESULT: ZERO LEAKS across all checks" : `\nRESULT: ${leaks} LEAK(S) DETECTED`);
  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
