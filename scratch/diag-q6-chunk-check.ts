import prisma from "../src/config/database/client";
async function main() {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, parent_chunk_id, chunk_type, heading, text_content FROM standard_chunks WHERE id='7b15f50c-eff6-480e-a0f2-a71ed3255c39'::uuid`
  );
  console.log("id:", rows[0].id);
  console.log("parent_chunk_id:", rows[0].parent_chunk_id);
  console.log("chunk_type:", rows[0].chunk_type);
  console.log("heading:", rows[0].heading);
  console.log("--- text_content (full) ---");
  console.log(rows[0].text_content);
  process.exit(0);
}
main();
