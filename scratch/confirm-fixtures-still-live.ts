import prisma from "../src/config/database/client";
(async () => {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, pdf_name, status FROM standard_documents
    WHERE id IN ('b12fe0ad-6961-4a00-9f93-b9241750206d', '22e93f1f-ffff-4020-bfc3-dcba81ff4ef8')
  `);
  console.log(rows);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
