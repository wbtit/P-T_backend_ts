import prisma from "../src/config/database/client";
import { resolveProjectDocumentIds, generateEmbedding } from "../src/modules/standards/services/retrievalService";
import { tableBranch, proseBranch } from "../src/modules/standards/services/retrievalTwoBranch";

const P1 = "1750b493-e567-4f19-a217-041dcafcb209"; // Test Project, no fabricator match, no prefs
const P2 = "09948b05-2045-4de5-aed5-82c9bb19ded0"; // Test Project, no fabricator match, no prefs
const NABERS = "5fa52afe-103f-4efc-afbd-23b7c6d2094d"; // Cobb Industrial's project
const RAY_STEEL = "3200a4a9-e657-49ac-8b4c-f39b8b00dc6b"; // RAY STEEL fabricator's project
const RAY_STEEL_FABRICATOR_ID = "fe9508b9-3f5f-4991-8231-818f95a49a98";
const COBB_FIXTURE_DOC_ID = "b12fe0ad-6961-4a00-9f93-b9241750206d";
const TOPCHORD_CHUNK_ID = "3860fbba-d470-427e-a75b-a1e6a8e203ea";

const GENERAL_DOC_IDS = [
  "c98019bf-dfbb-460f-971a-f003a0c53077", // AISC-CM-14
  "396840ef-34a2-487e-aaf0-61de4f82f983", // HILTI-PTG-2008
  "0c45d683-fd41-4806-b291-22ac65b8a626", // CANAM-SCD-2017
  "8fa1a87d-4da8-466b-a574-a358c3c03ba4", // SJI-SPEC-43
].sort();

async function main() {
  console.log("=== CLEANUP: dropping the 4 test preference rows (PROJECT tier retired, GENERAL now unconditional) ===");
  const del = await prisma.$executeRawUnsafe(`
    DELETE FROM project_standard_preferences WHERE project_id IN (
      '1750b493-e567-4f19-a217-041dcafcb209','09948b05-2045-4de5-aed5-82c9bb19ded0',
      '11cf6af3-337a-45f3-9604-474b30fffd1e','02dd55e5-0e09-4924-89bd-52334970ac12'
    )
  `);
  console.log("preference rows deleted:", del);
  const remaining: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM project_standard_preferences`);
  console.log("project_standard_preferences now:", remaining);

  console.log("\n=== SETUP: second FABRICATOR fixture (Ray Steel's own fabricator) ===");
  const newDoc: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO standard_documents (
      id, source_type, fabricator_id, pdf_name, storage_path, status,
      document_family_id, total_pages, pages_processed, uploaded_at
    ) VALUES (
      gen_random_uuid(), 'FABRICATOR', $1::uuid,
      'TEST FIXTURE -- FABRICATOR isolation acceptance test #2 (content copied from JoistTopChordWidth.pdf)',
      '__test_fixture__/fabricator-isolation-test-2.pdf',
      'ACTIVE', NULL, 1, 1, NOW()
    ) RETURNING id
  `, RAY_STEEL_FABRICATOR_ID);
  const rayFixtureId = newDoc[0].id;
  console.log("Ray Steel fixture document id:", rayFixtureId);

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
  `, TOPCHORD_CHUNK_ID, rayFixtureId);
  console.log("Ray Steel fixture chunk inserted");

  console.log("\n=== VERIFY: GENERAL-vs-GENERAL (P1, P2 -- no fabricator, no prefs -- must both see the full, identical GENERAL set) ===");
  const p1Ids = (await resolveProjectDocumentIds(P1)).sort();
  const p2Ids = (await resolveProjectDocumentIds(P2)).sort();
  console.log("P1 resolved:", p1Ids);
  console.log("P2 resolved:", p2Ids);
  console.log("P1 === expected GENERAL set:", JSON.stringify(p1Ids) === JSON.stringify(GENERAL_DOC_IDS));
  console.log("P2 === expected GENERAL set:", JSON.stringify(p2Ids) === JSON.stringify(GENERAL_DOC_IDS));
  console.log("P1 === P2 (identical, correctly shared):", JSON.stringify(p1Ids) === JSON.stringify(p2Ids));

  console.log("\n=== VERIFY: FABRICATOR-vs-FABRICATOR (Nabers/Cobb vs Ray Steel/RaySteel) ===");
  const nabersIds = await resolveProjectDocumentIds(NABERS);
  const rayIds = await resolveProjectDocumentIds(RAY_STEEL);
  console.log("Nabers resolved includes Cobb fixture:", nabersIds.includes(COBB_FIXTURE_DOC_ID), "| includes Ray fixture (must be false):", nabersIds.includes(rayFixtureId));
  console.log("Ray Steel resolved includes Ray fixture:", rayIds.includes(rayFixtureId), "| includes Cobb fixture (must be false):", rayIds.includes(COBB_FIXTURE_DOC_ID));
  console.log("Both also include full GENERAL set:",
    GENERAL_DOC_IDS.every((id) => nabersIds.includes(id)), GENERAL_DOC_IDS.every((id) => rayIds.includes(id)));

  console.log("\n=== VERIFY: actual tableBranch/proseBranch, real embedding, all 4 real projects ===");
  const vec = await generateEmbedding("steel joist standard specifications and dimensions");
  const subjects = [
    { label: "P1", ids: p1Ids },
    { label: "P2", ids: p2Ids },
    { label: "Nabers(Cobb)", ids: nabersIds },
    { label: "RaySteel", ids: rayIds },
  ];
  const results: Record<string, Set<string>> = {};
  for (const s of subjects) {
    const [t, pr] = await Promise.all([
      tableBranch(vec, "steel joist standard specifications", s.ids, 10),
      proseBranch("steel joist standard specifications", vec, s.ids, 10),
    ]);
    const seen = new Set([...t, ...pr].map((c) => c.documentId));
    results[s.label] = seen;
    const foreign = [...seen].filter((id) => !s.ids.includes(id));
    console.log(`${s.label}: docs seen=${[...seen].length}`, foreign.length ? `!! FOREIGN: ${foreign}` : "OK (no foreign docs)");
  }
  console.log("Nabers sees Cobb fixture:", results["Nabers(Cobb)"].has(COBB_FIXTURE_DOC_ID), "| sees Ray fixture (must be false):", results["Nabers(Cobb)"].has(rayFixtureId));
  console.log("RaySteel sees Ray fixture:", results["RaySteel"].has(rayFixtureId), "| sees Cobb fixture (must be false):", results["RaySteel"].has(COBB_FIXTURE_DOC_ID));

  console.log("\nRAY_STEEL_FIXTURE_DOC_ID=", rayFixtureId);
  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
