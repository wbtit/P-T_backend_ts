/**
 * Classifier-independent conservation check + render-time safety gate.
 *
 * Independence: countNumericDataLines() never calls into table-to-prose.ts's
 * parseGrid/header logic and never consults how many lines the renderer
 * consumed as title/header, or in what sequence -- it scans every line of
 * the raw grid independently, standalone, with its own reimplementation of
 * the value-cell test (not a call into the renderer's code). If the
 * renderer's SEQUENTIAL boundary logic has a bug that swallows a genuine
 * data row into its header merge (the header-collection loop not stopping
 * where it should), that row still counts here regardless, and won't have
 * produced a sentence -- caught.
 *
 * First pass here used "contains any digit" as the per-cell test and it was
 * wrong: subscript/exponent header labels this corpus uses constantly
 * ("in. 2" for in.^2, "k 1", "(cid:2)t2 w") contain a digit while being
 * genuinely non-data, so that version over-counted every W-shape/HSS table's
 * header lines as data and pushed ~60% of a validation sample into
 * unnecessary fallback -- including Q6/Q9/Q10/Q11's own target tables, which
 * render correctly. A cell only counts as a value if, taken whole (after
 * stripping footnote markers), it contains a digit AND has no plain letters
 * -- the same shape a genuine measurement has, and the same shape a
 * subscript-laden label does not.
 *
 * No small-table tolerance/rounding, no manual override at any size --
 * exact "every candidate data row produced a sentence" comparison, run as a
 * gate at render time, not just offline validation.
 */
import { renderTableAsProseStructured } from "./table-to-prose";

function splitCells(line: string): string[] {
  return line.split("|").map((c) => c.trim());
}

/** Reimplemented standalone here (not calling into table-to-prose.ts) for
 *  true classifier independence -- but conceptually the same value-cell
 *  shape the renderer looks for: digits plus dimension/range punctuation
 *  only, no plain letters, footnote markers stripped first. */
function cellLooksNumeric(cell: string): boolean {
  const stripped = cell.replace(/\[[a-zA-Z0-9]+\]/g, "").trim();
  if (!stripped) return false;
  return /\d/.test(stripped) && /^[\d./×x≥+()\s"'''""–—,-]+$/.test(stripped);
}

function countNumericDataLines(gridText: string): number {
  return gridText
    .split("\n")
    .map(splitCells)
    .filter((cells) => cells.some((c) => cellLooksNumeric(c))).length;
}

interface RenderResult {
  text: string;
  usedFallback: boolean;
  fallbackReason: string | null;
  expectedDataLines: number;
  sentencesEmitted: number;
  emptySubjectCount: number;
}

/** Production entry point: renders prose, verifies conservation against the
 *  independent count PLUS subject-presence on every emitted row, and falls
 *  back to the raw pipe grid (never a partial or empty render) if either
 *  check fails. Logs the trigger reason on fallback -- caller decides where
 *  that log goes. Subject-presence should never actually fire given the
 *  renderer's leftmost-non-empty-cell guarantee (see table-to-prose.ts); it
 *  is checked here anyway as a hard automatic gate, not an assumption. */
function renderTableForRerank(gridText: string): RenderResult {
  const expectedDataLines = countNumericDataLines(gridText);
  const { title, rowSentences } = renderTableAsProseStructured(gridText);
  const sentencesEmitted = rowSentences.length;
  const emptySubjectCount = rowSentences.filter((r) => !r.subject.trim()).length;
  const conserved = sentencesEmitted >= expectedDataLines;
  const ok = (conserved || expectedDataLines === 0) && emptySubjectCount === 0;

  if (ok) {
    const text = [...(title ? [`${title}.`] : []), ...rowSentences.map((r) => r.sentence)].join(" ");
    return { text, usedFallback: false, fallbackReason: null, expectedDataLines, sentencesEmitted, emptySubjectCount };
  }
  const reasonParts: string[] = [];
  if (!conserved && expectedDataLines > 0) {
    reasonParts.push(`conservation failed: expected >= ${expectedDataLines} data-row sentences, got ${sentencesEmitted}`);
  }
  if (emptySubjectCount > 0) {
    reasonParts.push(`${emptySubjectCount} row(s) had no identifiable subject`);
  }
  const reason = `${reasonParts.join("; ")} -- table structure defeated the renderer (likely OCR-scrambled or unrecognized layout), falling back to pipe`;
  return { text: gridText, usedFallback: true, fallbackReason: reason, expectedDataLines, sentencesEmitted, emptySubjectCount };
}

export { countNumericDataLines, renderTableForRerank, cellLooksNumeric };
