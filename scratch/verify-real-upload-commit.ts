import prisma from "../src/config/database/client";
(async () => {
  const docId = "f57022c8-7cdc-469e-b11e-c9c3d932adeb";
  const doc: any[] = await prisma.$queryRawUnsafe(`SELECT id, status, storage_path, total_pages, pages_processed FROM standard_documents WHERE id = $1::uuid`, docId);
  console.log("document row:", doc);
  const pages: any[] = await prisma.$queryRawUnsafe(`SELECT page_number, image_path FROM standard_pages WHERE document_id = $1::uuid ORDER BY page_number`, docId);
  console.log("pages:", pages);
  const chunks: any[] = await prisma.$queryRawUnsafe(`SELECT chunk_type, page_start, embedding IS NOT NULL as has_embedding, document_family_id, edition FROM standard_chunks WHERE document_id = $1::uuid`, docId);
  console.log("chunks:", chunks);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
