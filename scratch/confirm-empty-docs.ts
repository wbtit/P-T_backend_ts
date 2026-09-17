import prisma from "../src/config/database/client";
(async () => {
  const ids = ['42081ccd-0175-42cd-ad4e-338b6843c4b9', '9c8e8e95-8a11-4c5e-9d3b-bfa0fa7f8b77'];

  for (const id of ids) {
    const pages: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_pages WHERE document_id = $1::uuid`, id);
    const chunks: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_chunks WHERE document_id = $1::uuid`, id);
    console.log(id, "pages:", pages, "chunks:", chunks);
  }
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
