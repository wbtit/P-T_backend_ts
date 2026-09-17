import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  // Any project that has standards enabled / has used chat before, to run a real QUERY against.
  const projects = await prisma.$queryRawUnsafe<any[]>(`
    SELECT DISTINCT p.id, p.name
    FROM standard_chat_messages m
    JOIN "Project" p ON p.id = m.project_id
    LIMIT 5
  `).catch((e) => { console.log("chat-message-based project lookup failed:", e.message); return []; });
  console.log("candidate projects (from chat history):", JSON.stringify(projects, null, 2));

  const anyProject = await prisma.project.findFirst({ select: { id: true, name: true } }).catch((e) => {
    console.log("project.findFirst failed:", e.message);
    return null;
  });
  console.log("fallback any project:", JSON.stringify(anyProject));

  // Corpus-wide check: any GENERAL document with a non-null fabricator_id.
  const badDocs = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, pdf_name, source_type, document_family_id, fabricator_id, status, uploaded_at
    FROM standard_documents
    WHERE source_type = 'GENERAL' AND fabricator_id IS NOT NULL
    ORDER BY uploaded_at
  `);
  console.log("GENERAL docs with non-null fabricator_id:", JSON.stringify(badDocs, null, 2));

  await prisma.$disconnect();
})();
