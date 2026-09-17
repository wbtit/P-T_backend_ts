import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const beforeDocs = await prisma.standardDocument.count();
  const deletedMsg = await prisma.standardChatMessage.delete({ where: { id: "15b0d954-9a74-4228-9922-19f2436db4e2" } });
  console.log("deleted message:", deletedMsg.id, deletedMsg.queryText);

  const deletedDoc = await prisma.standardDocument.delete({ where: { id: "e504d84b-b8cd-43ce-9f0b-cea25c734c76" } });
  console.log("deleted document:", deletedDoc.id, deletedDoc.pdfName);

  const afterDocs = await prisma.standardDocument.count();
  console.log(`standard_documents count: ${beforeDocs} -> ${afterDocs}`);

  const activeCount = await prisma.standardDocument.count({ where: { status: "ACTIVE" } });
  console.log("remaining ACTIVE documents:", activeCount);
  await prisma.$disconnect();
})();
