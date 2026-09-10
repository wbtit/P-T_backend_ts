import prisma from "../src/config/database/client";

const AISC = "c98019bf-dfbb-460f-971a-f003a0c53077";
const SJI = "8fa1a87d-4da8-466b-a574-a358c3c03ba4";
const EA = "396840ef-34a2-487e-aaf0-61de4f82f983";

async function sample(doc: string, name: string, n: number) {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, page_start, text_content FROM standard_chunks
     WHERE document_id=$1::uuid AND chunk_type='TABLE' AND parent_chunk_id IS NULL
     ORDER BY page_start`, doc
  );
  console.log(`\n=== ${name}: ${rows.length} table parents, showing every ${Math.floor(rows.length/n)}th ===`);
  const step = Math.max(1, Math.floor(rows.length / n));
  for (let i = 0; i < rows.length; i += step) {
    const r = rows[i];
    const firstLine = (r.text_content as string).split("\n")[0];
    console.log(`  page=${r.page_start} id=${r.id.slice(0,8)} first_line=${firstLine.slice(0,90)}`);
  }
}

async function main() {
  await sample(AISC, "AISC", 15);
  await sample(SJI, "SJI", 8);
  await sample(EA, "EA", 13); // show all 13, it's small
  process.exit(0);
}
main();
