import prisma from "../src/config/database/client";

const DOC_ID = "17affb6d-7b66-44ef-8910-c658538c55f7";

async function main() {
  console.log("=== 1. Chunk counts by type ===");
  const byType: any[] = await prisma.$queryRawUnsafe(
    `SELECT chunk_type, count(*) n FROM standard_chunks WHERE document_id=$1::uuid GROUP BY chunk_type ORDER BY chunk_type`,
    DOC_ID
  );
  console.log(byType.map(r => `${r.chunk_type}=${r.n}`).join(", "));

  console.log("\n=== 1b. Parent vs child breakdown ===");
  const parentChild: any[] = await prisma.$queryRawUnsafe(
    `SELECT chunk_type, (parent_chunk_id IS NULL) AS is_parent, count(*) n
     FROM standard_chunks WHERE document_id=$1::uuid GROUP BY chunk_type, is_parent ORDER BY chunk_type, is_parent`,
    DOC_ID
  );
  for (const r of parentChild) console.log(`  ${r.chunk_type} ${r.is_parent ? "parent" : "child"}: ${r.n}`);

  console.log("\n=== 2. Page counts by status/reason ===");
  const pageStatus: any[] = await prisma.$queryRawUnsafe(
    `SELECT extraction_status, visual_only_reason, count(*) n
     FROM standard_pages WHERE document_id=$1::uuid
     GROUP BY extraction_status, visual_only_reason ORDER BY extraction_status, visual_only_reason`,
    DOC_ID
  );
  for (const r of pageStatus) console.log(`  ${r.extraction_status} / ${r.visual_only_reason ?? "null"}: ${r.n}`);
  const totalPages: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*) n FROM standard_pages WHERE document_id=$1::uuid`, DOC_ID
  );
  console.log(`  total pages: ${totalPages[0].n}`);

  console.log("\n=== 3. Zero orphans: children whose parent_chunk_id doesn't resolve to a real row ===");
  const orphans: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*) n FROM standard_chunks c
     WHERE c.document_id=$1::uuid AND c.parent_chunk_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM standard_chunks p WHERE p.id = c.parent_chunk_id)`,
    DOC_ID
  );
  console.log(`  orphaned children: ${orphans[0].n}`);

  console.log("\n=== 4. Zero dangling parent refs: parent_chunk_id pointing to a DIFFERENT document ===");
  const crossDoc: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*) n FROM standard_chunks c
     JOIN standard_chunks p ON p.id = c.parent_chunk_id
     WHERE c.document_id=$1::uuid AND p.document_id != c.document_id`,
    DOC_ID
  );
  console.log(`  cross-document parent refs: ${crossDoc[0].n}`);

  console.log("\n=== 4b. Parent/child invariant: every TABLE parent EXTRACTED has >=1 child; no child without a parent row of chunk_type TABLE ===");
  const tableParentsNoChildren: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*) n FROM standard_chunks p
     WHERE p.document_id=$1::uuid AND p.chunk_type='TABLE' AND p.parent_chunk_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM standard_chunks c WHERE c.parent_chunk_id = p.id)`,
    DOC_ID
  );
  console.log(`  TABLE parents with zero children: ${tableParentsNoChildren[0].n}`);

  console.log("\n=== 5. Embedding rules: TABLE parents should be NULL, everything else NOT NULL ===");
  const embedRules: any[] = await prisma.$queryRawUnsafe(
    `SELECT chunk_type, (parent_chunk_id IS NULL) AS is_parent,
            (embedding IS NULL) AS embedding_null, count(*) n
     FROM standard_chunks WHERE document_id=$1::uuid
     GROUP BY chunk_type, is_parent, embedding_null ORDER BY chunk_type, is_parent, embedding_null`,
    DOC_ID
  );
  for (const r of embedRules) console.log(`  ${r.chunk_type} ${r.is_parent ? "parent" : "child"} embedding_null=${r.embedding_null}: ${r.n}`);

  console.log("\n=== 5b. Any non-TABLE-parent chunk with a NULL embedding (should be zero) ===");
  const badNulls: any[] = await prisma.$queryRawUnsafe(
    `SELECT chunk_type, parent_chunk_id, page_start FROM standard_chunks
     WHERE document_id=$1::uuid AND embedding IS NULL
       AND NOT (chunk_type='TABLE' AND parent_chunk_id IS NULL)`,
    DOC_ID
  );
  console.log(`  unexpected NULL embeddings: ${badNulls.length}`, badNulls);

  console.log("\n=== 6. Family/edition populated ===");
  const famCheck: any[] = await prisma.$queryRawUnsafe(
    `SELECT document_family_id, edition, count(*) n FROM standard_chunks
     WHERE document_id=$1::uuid GROUP BY document_family_id, edition`,
    DOC_ID
  );
  console.log(famCheck);

  console.log("\n=== 6b. Document row itself ===");
  const doc: any[] = await prisma.$queryRawUnsafe(
    `SELECT source_type, status, document_family_id, pages_processed, total_pages FROM standard_documents WHERE id=$1::uuid`,
    DOC_ID
  );
  console.log(doc[0]);

  console.log("\n=== 6c. Family row ===");
  const fam: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, family_code, edition, is_default FROM standard_families WHERE id='HILTI-ER-2001'`
  );
  console.log(fam[0]);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
