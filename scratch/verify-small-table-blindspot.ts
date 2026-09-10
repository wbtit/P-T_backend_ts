import prisma from "../src/config/database/client";
import { renderTableAsProse } from "./table-to-prose";

async function show(prefix: string, note: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, text_content FROM standard_chunks WHERE chunk_type='TABLE' AND parent_chunk_id IS NULL AND id::text LIKE $1`,
    `${prefix}%`
  );
  if (!rows.length) { console.log(`NOT FOUND: ${prefix}`); return; }
  console.log(`\n${"=".repeat(80)}\n### ${note} [id=${rows[0].id}]\n--- RAW (full) ---`);
  console.log(rows[0].text_content);
  console.log(`--- PROSE (full) ---`);
  console.log(renderTableAsProse(rows[0].text_content));
}

async function main() {
  await show("49a89a58", "EA p11, single-letter wide columns A-N");
  await show("3f26066b", "SJI p17, weld table");
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
