import prisma from "../src/config/database/client";
(async () => {
  const total: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_documents`);
  console.log("baseline standard_documents count:", total);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
