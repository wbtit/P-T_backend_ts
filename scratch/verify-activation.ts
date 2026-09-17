import prisma from "../src/config/database/client";
(async () => {
  const docId = "f57022c8-7cdc-469e-b11e-c9c3d932adeb";
  const doc: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, status, total_pages, pages_processed, document_family_id, source_type
    FROM standard_documents WHERE id = $1::uuid
  `, docId);
  console.log("document after activation:", doc);
  const chunks: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_chunks WHERE document_id = $1::uuid`, docId);
  console.log("chunk count (should still be 2):", chunks);
  const pages: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_pages WHERE document_id = $1::uuid`, docId);
  console.log("page count (should still be 2):", pages);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
