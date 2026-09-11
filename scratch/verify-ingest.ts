import prisma from "../src/config/database/client";

async function main() {
  const docId = process.argv[2];
  const q = (sql: string) => prisma.$queryRawUnsafe(sql.replace("?", "'" + docId + "'::uuid"));

  console.log("=== 1. Document row ===");
  const doc = await prisma.standardDocument.findUnique({ where: { id: docId } });
  if (!doc) { console.log("NOT FOUND"); process.exit(1); }
  console.log(JSON.stringify({ id: doc.id, pdfName: doc.pdfName, family: doc.documentFamilyId, status: doc.status, totalPages: doc.totalPages, pagesProcessed: doc.pagesProcessed, noHeadingsDetected: doc.noHeadingsDetected, headingCoverageRatio: doc.headingCoverageRatio, outlineCoverageRatio: doc.outlineCoverageRatio }));

  console.log("=== 2. Pages by status/reason ===");
  const st = await q("SELECT extraction_status, visual_only_reason, COUNT(*)::int n FROM standard_pages WHERE document_id = ? GROUP BY 1,2 ORDER BY 1,2");
  for (const r of st as any[]) console.log("  " + r.extraction_status + " / " + (r.visual_only_reason ?? "-") + ": " + r.n);
  const tot = await q("SELECT COUNT(*)::int n FROM standard_pages WHERE document_id = ?");
  console.log("  total pages: " + (tot as any[])[0].n);

  console.log("=== 3. Chunks by type + parent/child ===");
  const ch = await q("SELECT chunk_type, (parent_chunk_id IS NULL) AS is_parent, COUNT(*)::int n FROM standard_chunks WHERE document_id = ? GROUP BY 1,2 ORDER BY 1,2");
  for (const r of ch as any[]) console.log("  " + r.chunk_type + " " + (r.is_parent ? "parent" : "child") + ": " + r.n);

  console.log("=== 4. Zero orphans ===");
  const orph = await q("SELECT COUNT(*)::int n FROM standard_chunks c WHERE c.document_id = ? AND c.parent_chunk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM standard_chunks p WHERE p.id = c.parent_chunk_id)");
  console.log("  orphans: " + (orph as any[])[0].n);

  console.log("=== 5. Embedding rules ===");
  const emb = await q(`SELECT
      COUNT(*) FILTER (WHERE chunk_type='TABLE' AND parent_chunk_id IS NULL AND embedding IS NULL)::int AS parents_null_emb,
      COUNT(*) FILTER (WHERE chunk_type='TABLE' AND parent_chunk_id IS NULL AND embedding IS NOT NULL)::int AS parents_with_emb_BAD,
      COUNT(*) FILTER (WHERE parent_chunk_id IS NOT NULL AND embedding IS NULL)::int AS children_null_emb_BAD,
      COUNT(*) FILTER (WHERE chunk_type='VISUAL' AND embedding IS NULL)::int AS visual_null_emb,
      COUNT(*) FILTER (WHERE chunk_type='PROSE' AND embedding IS NULL)::int AS prose_null_emb
      FROM standard_chunks WHERE document_id = ?`);
  console.log(JSON.stringify((emb as any[])[0]));

  console.log("=== 6. Reliability reason (A11) ===");
  const rel = await q("SELECT reliability_reason, chunk_type, COUNT(*)::int n FROM standard_chunks WHERE document_id = ? AND reliability_reason IS NOT NULL GROUP BY 1,2");
  for (const r of rel as any[]) console.log("  " + r.reliability_reason + " on " + r.chunk_type + ": " + r.n);
  if (!rel.length) console.log("  (none)");

  console.log("=== 7. Family/edition populated ===");
  const fam = await q("SELECT document_family_id, edition, COUNT(*)::int n FROM standard_chunks WHERE document_id = ? GROUP BY 1,2");
  for (const r of fam as any[]) console.log("  family=" + r.document_family_id + " edition=" + r.edition + " on " + r.n + " chunks");
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
