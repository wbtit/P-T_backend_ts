import prisma from "../src/config/database/client";
(async () => {
  const ids = ['42081ccd-0175-42cd-ad4e-338b6843c4b9', '9c8e8e95-8a11-4c5e-9d3b-bfa0fa7f8b77'];

  const before: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*) FROM standard_chat_answers WHERE pinned_document_id = ANY($1::uuid[])`, ids
  );
  console.log("standard_chat_answers rows matching predicate BEFORE delete:", before);

  const deleted: number = await prisma.$executeRawUnsafe(
    `DELETE FROM standard_chat_answers WHERE pinned_document_id = ANY($1::uuid[])`, ids
  );
  console.log("rows deleted (executeRaw return value):", deleted);

  const after: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*) FROM standard_chat_answers WHERE pinned_document_id = ANY($1::uuid[])`, ids
  );
  console.log("standard_chat_answers rows matching predicate AFTER delete:", after);

  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
