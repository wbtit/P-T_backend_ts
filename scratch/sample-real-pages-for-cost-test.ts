import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  // Pick a few real pages across different documents/extraction statuses
  const pages = await prisma.$queryRawUnsafe<any[]>(`
    SELECT sp.id, sp.document_id, sp.page_number, sp.extraction_status, LENGTH(sp.text_content) as text_len
    FROM standard_pages sp
    JOIN standard_documents sd ON sd.id = sp.document_id
    WHERE sd.status = 'ACTIVE'
    ORDER BY random()
    LIMIT 6
  `);
  console.log(JSON.stringify(pages, null, 2));
  await prisma.$disconnect();
})();
