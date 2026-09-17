import prisma from "../src/config/database/client";
(async () => {
  const total: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_documents`);
  console.log("standard_documents total count now:", total);

  const fks: any[] = await prisma.$queryRawUnsafe(`
    SELECT tc.table_name, kcu.column_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'standard_documents'
  `);
  console.log("live FKs pointing at standard_documents (unchanged, for reference):", fks);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
