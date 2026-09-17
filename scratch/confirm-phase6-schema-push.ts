import prisma from "../src/config/database/client";
(async () => {
  const col: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'standard_documents' AND column_name = 'ingest_report'
  `);
  console.log("ingest_report column:", col);

  const enumVals: any[] = await prisma.$queryRawUnsafe(`
    SELECT enumlabel FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'StandardDocumentStatus'
    ORDER BY enumsortorder
  `);
  console.log("StandardDocumentStatus values:", enumVals.map(e => e.enumlabel));
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
