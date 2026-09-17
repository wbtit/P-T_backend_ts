import prisma from "../src/config/database/client";
const SJI = "8fa1a87d-4da8-466b-a574-a358c3c03ba4";

function norm(s: string) { return s.replace(/\s+/g, " ").toLowerCase(); }

async function main() {
  // search for "bearing seat depth" phrase anywhere in SJI
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, page_start, chunk_type, text_content FROM standard_chunks WHERE document_id=$1::uuid AND (text_content ILIKE '%bearing seat depth%' OR text_content ILIKE '%seat depth%')`,
    SJI
  );
  console.log(`Found ${rows.length} chunks mentioning "seat depth"`);
  for (const r of rows) {
    console.log(`\n--- id=${r.id} page=${r.page_start} type=${r.chunk_type} ---`);
    const idx = norm(r.text_content).indexOf("seat depth");
    console.log(r.text_content.slice(Math.max(0, idx-100), idx+400));
  }
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
