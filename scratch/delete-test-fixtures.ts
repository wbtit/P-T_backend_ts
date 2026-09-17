import prisma from "../src/config/database/client";
(async () => {
  console.log("=== BEFORE ===");
  const before: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_documents`);
  console.log("total standard_documents:", before);

  console.log("\n=== deleting chat answer (cascades to its citation) ===");
  const delAnswer = await prisma.$executeRawUnsafe(`DELETE FROM standard_chat_answers WHERE id = $1::uuid`, "21a7085d-1954-4e04-b11d-54995671cb3b");
  console.log("answers deleted:", delAnswer);

  console.log("=== deleting now-childless chat message ===");
  const delMessage = await prisma.$executeRawUnsafe(`DELETE FROM standard_chat_messages WHERE id = $1::uuid`, "328c8b6d-8c61-4585-b108-0305dfc25eb3");
  console.log("messages deleted:", delMessage);

  console.log("=== deleting 3 test-fixture documents (cascades to chunks/pages) ===");
  const ids = ["b12fe0ad-6961-4a00-9f93-b9241750206d", "22e93f1f-ffff-4020-bfc3-dcba81ff4ef8", "f57022c8-7cdc-469e-b11e-c9c3d932adeb"];
  const delDocs = await prisma.$executeRawUnsafe(`DELETE FROM standard_documents WHERE id = ANY($1::uuid[])`, ids);
  console.log("documents deleted:", delDocs);

  console.log("\n=== AFTER ===");
  const after: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_documents`);
  console.log("total standard_documents:", after);
  const remaining: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM standard_documents WHERE id = ANY($1::uuid[])`, ids);
  console.log("of the 3 target ids, how many remain (should be 0):", remaining);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
