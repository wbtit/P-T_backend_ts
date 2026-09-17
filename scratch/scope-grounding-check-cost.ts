import prisma from "../src/config/database/client";

// Patterns worth checking, chosen from what this project's own reports have
// already found as real: feet/inch prime marks (straight and curly), the
// Wood-Beam "!" foot-mark font substitution, fraction notation (both ASCII
// "1/2" and mixed numbers "1 1/2"), unicode fraction glyphs, and the common
// structural-steel unit tokens. NOT checking × vs x -- that's already
// normalized at storage time (manifestChunking.ts normalizeMultiplicationSign)
// and is a closed issue, not part of this open-ended survey.
const PATTERNS: Record<string, RegExp> = {
  "straight prime/double-prime (7', 7\")": /\d\s*['"]/g,
  "curly prime/double-prime (’ ”)": /\d\s*[’”]/g,
  "bang foot-mark artifact (17!-01)": /\d!/g,
  "ascii fraction (1/2, 3/4)": /\b\d\/\d\b/g,
  "mixed-number fraction (1 1/2)": /\b\d+\s+\d\/\d\b/g,
  "unicode fraction glyphs (½ ¾ etc)": /[¼-¾⅐-⅞]/g,
  "unit: mm": /\bmm\b/gi,
  "unit: in/inch(es)": /\b(in|inch|inches)\b/gi,
  "unit: ft/feet": /\b(ft|feet)\b/gi,
  "unit: kips/kip": /\bkips?\b/gi,
  "unit: psf": /\bpsf\b/gi,
  "unit: lb/lbs": /\blbs?\b/gi,
  "unit: ksi": /\bksi\b/gi,
  "unit: kN": /\bkN\b/g,
  "unit: MPa": /\bMPa\b/g,
};

(async () => {
  const docs: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, pdf_name FROM standard_documents ORDER BY pdf_name
  `);

  const grandTotals: Record<string, number> = {};
  for (const key of Object.keys(PATTERNS)) grandTotals[key] = 0;
  const perDocSummary: any[] = [];

  for (const doc of docs) {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT text_content FROM standard_chunks WHERE document_id = $1::uuid AND parent_chunk_id IS NULL`,
      doc.id
    );
    if (rows.length === 0) continue;
    const fullText = rows.map(r => r.text_content).join("\n");
    const docCounts: Record<string, number> = {};
    for (const [key, pat] of Object.entries(PATTERNS)) {
      const m = fullText.match(pat);
      docCounts[key] = m ? m.length : 0;
      grandTotals[key] += docCounts[key];
    }
    perDocSummary.push({ pdf_name: doc.pdf_name, ...docCounts });
  }

  console.log("=== Per-document pattern counts (non-child chunks only) ===");
  for (const d of perDocSummary) {
    const nonZero = Object.entries(d).filter(([k, v]) => k !== "pdf_name" && (v as number) > 0);
    console.log(d.pdf_name, "->", Object.fromEntries(nonZero));
  }

  console.log("\n=== Corpus-wide totals ===");
  console.log(grandTotals);

  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
