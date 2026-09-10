import prisma from "../src/config/database/client";
async function main() {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, parent_chunk_id, chunk_type FROM standard_chunks WHERE document_id='8fa1a87d-4da8-466b-a574-a358c3c03ba4'::uuid AND page_start=185`
  );
  for (const r of rows) console.log(r);
  process.exit(0);
}
main();
