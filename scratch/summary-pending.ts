import prisma from "../src/config/database/client";

async function main() {
  const docs = await prisma.standardDocument.findMany({
    where: { status: "PENDING" },
    select: { id: true, pdfName: true, documentFamilyId: true, totalPages: true, pagesProcessed: true },
    orderBy: { uploadedAt: "asc" },
  });
  for (const d of docs) {
    const q = (sql: string) => prisma.$queryRawUnsafe(sql.replace("?", "'" + d.id + "'::uuid"));
    const st = await q("SELECT extraction_status, COUNT(*)::int n FROM standard_pages WHERE document_id = ? GROUP BY 1");
    const ch = await q("SELECT chunk_type, COUNT(*)::int n, COUNT(parent_chunk_id)::int kids FROM standard_chunks WHERE document_id = ? GROUP BY 1");
    const orph = await q("SELECT COUNT(*)::int n FROM standard_chunks c WHERE c.document_id = ? AND c.parent_chunk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM standard_chunks p WHERE p.id = c.parent_chunk_id)");
    const tot = st.reduce((s: number, x: any) => s + x.n, 0);
    const vo = st.reduce((s: number, x: any) => s + (x.extraction_status === "VISUAL_ONLY" ? x.n : 0), 0);
    console.log(d.pdfName + " | fam=" + d.documentFamilyId + " | pages=" + tot + " vo=" + vo + " (" + (100 * vo / tot).toFixed(1) + "%) | chunks=" + JSON.stringify(ch.map((x: any) => x.chunk_type + "=" + x.n + "(kids:" + x.kids + ")")) + " | orphans=" + (orph as any[])[0].n);
  }
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
