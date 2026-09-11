import prisma from "../src/config/database/client";
(async () => {
  const docs: any[] = await prisma.$queryRawUnsafe(`
    SELECT d.id, d.status, d.source_type, d.document_family_id, f.edition,
           d.pdf_name, d.total_pages,
           (SELECT count(*) FROM standard_pages p WHERE p.document_id = d.id) as page_count,
           (SELECT count(*) FROM standard_chunks c WHERE c.document_id = d.id) as chunk_count
    FROM standard_documents d
    LEFT JOIN standard_families f ON f.id = d.document_family_id
    ORDER BY d.status, d.uploaded_at
  `);
  console.log("=== All standard_documents ===");
  for (const d of docs) console.log(d);

  console.log("\n=== Totals by status ===");
  const byStatus: any[] = await prisma.$queryRawUnsafe(`
    SELECT status, count(*) as n_docs FROM standard_documents GROUP BY status
  `);
  console.log(byStatus);

  const totalPending: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT count(*) FROM standard_documents WHERE status = 'PENDING') as pending_docs,
      (SELECT count(*) FROM standard_pages sp JOIN standard_documents sd ON sd.id = sp.document_id WHERE sd.status = 'PENDING') as pending_pages,
      (SELECT count(*) FROM standard_chunks sc JOIN standard_documents sd ON sd.id = sc.document_id WHERE sd.status = 'PENDING') as pending_chunks
  `);
  console.log("\n=== PENDING totals ===", totalPending);

  const totalAll: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT count(*) FROM standard_documents) as total_docs,
      (SELECT count(*) FROM standard_pages) as total_pages,
      (SELECT count(*) FROM standard_chunks) as total_chunks
  `);
  console.log("\n=== Corpus-wide totals (all statuses) ===", totalAll);

  const orphans: any[] = await prisma.$queryRawUnsafe(`
    SELECT count(*) as orphan_children
    FROM standard_chunks c
    WHERE c.parent_chunk_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM standard_chunks p WHERE p.id = c.parent_chunk_id)
  `);
  console.log("\n=== Orphan children (parent_chunk_id points nowhere) ===", orphans);

  const parentsNoChildren: any[] = await prisma.$queryRawUnsafe(`
    SELECT count(*) as parents_without_children
    FROM standard_chunks p
    WHERE p.chunk_type = 'TABLE' AND p.parent_chunk_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM standard_chunks c WHERE c.parent_chunk_id = p.id)
  `);
  console.log("=== TABLE parents with zero children ===", parentsNoChildren);

  const familyEdition: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      count(*) as total_chunks,
      count(document_family_id) as chunks_with_family,
      count(edition) as chunks_with_edition
    FROM standard_chunks
  `);
  console.log("\n=== Family/edition population, corpus-wide (all standard_chunks rows) ===", familyEdition);

  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
