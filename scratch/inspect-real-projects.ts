import prisma from "../src/config/database/client";
(async () => {
  const projects: any[] = await prisma.$queryRawUnsafe(`
    SELECT p.id, p.name, p."fabricatorID",
      (SELECT count(*) FROM project_standard_preferences psp WHERE psp.project_id = p.id) as n_prefs
    FROM project p
    ORDER BY p.name
  `);
  console.log("Total projects:", projects.length);
  for (const p of projects) console.log(p);

  const prefs: any[] = await prisma.$queryRawUnsafe(`
    SELECT project_id, standard_family_id, source_type FROM project_standard_preferences ORDER BY project_id
  `);
  console.log("\nAll project_standard_preferences rows:", prefs);

  const fabDocs: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, pdf_name, fabricator_id, source_type, status FROM standard_documents WHERE source_type = 'FABRICATOR'
  `);
  console.log("\nFABRICATOR-source documents:", fabDocs);

  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
