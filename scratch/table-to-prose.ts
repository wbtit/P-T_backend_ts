/**
 * (c) Reranker-input-only table-to-prose renderer. Rerank-time transform,
 * generated from the same structured grid text already in the parent chunk --
 * does NOT touch ingestion, storage, text_content, or embeddings.
 *
 * v2 rewrite. Root causes fixed from v1's validation failures:
 *  1. Row-was-data misclassified-as-header (J3.2, SJI p17/p200): v1 required
 *     a MAJORITY of a row's cells to look purely numeric, which tips over
 *     from a single non-conforming cell (a footnote-bracketed value like
 *     "27 (188) [c] [d]", or an ASCII "x"/quote-mark dimension like
 *     '1/8" x 2"'). v2 instead asks "does this row contain AT LEAST ONE
 *     cell that looks like a value" -- one strong signal is enough, and the
 *     per-cell test itself now tolerates footnote markers ([a],[b],[c]...),
 *     ASCII "x", straight/curly quotes, and em-dashes, all of which are
 *     common in this corpus's dimension/range notation.
 *  2. Row-subject assumed to be column 0 (EA p11): a row's real label can
 *     live in a later column when column 0 is blank (a continuation/merged
 *     cell). Subject is now the row's own leftmost non-empty cell; carry
 *     forward from the previous row's subject only in the (should-be
 *     impossible, since blank rows are filtered upstream) case no cell has
 *     any content -- defensive, not expected to fire in practice.
 *  3. Silent row loss: NEVER. Conservation is enforced as a runtime gate,
 *     not just an offline check -- see renderTableForRerank().
 */

interface ParsedTable {
  title: string;
  header: string[];
  rows: string[][];
}

function splitCells(line: string): string[] {
  return line.split("|").map((c) => c.trim());
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c === "");
}

/** A cell "looks like a value" if, after stripping footnote markers
 *  ([a],[b],[1]...), it consists only of digits and common
 *  dimension/range punctuation: . / × x ≥ + ( ) - – , " ' and whitespace.
 *  Deliberately does NOT allow general letters, so subscript-laden header
 *  labels ("k 1", "t w", "in. 2") still fail this test and stay header. */
function looksLikeValueCell(cell: string): boolean {
  const stripped = cell.replace(/\[[a-zA-Z0-9]+\]/g, "").trim();
  if (!stripped) return true; // was purely a footnote marker -- treat as compatible/blank
  return /^[\d./×x≥+()\s"'''""–—,-]+$/.test(stripped);
}

/** A row is DATA if at least one non-empty cell looks like a value. One
 *  strong signal is enough -- avoids the majority-ratio tip-over that
 *  misclassified real data rows as header in v1. */
function isDataRow(cells: string[]): boolean {
  return cells.some((c) => c !== "" && looksLikeValueCell(c));
}

/** True if every non-empty cell is plain label-shaped (letters, not values)
 *  -- used only for header/title collection, not for the data-row test. */
function looksLikeLabelRow(cells: string[]): boolean {
  const nonEmpty = cells.filter((c) => c !== "");
  if (!nonEmpty.length) return false;
  return !isDataRow(cells);
}

function parseGrid(gridText: string): ParsedTable {
  const rawLines = gridText.split("\n");
  const lines = rawLines.map(splitCells);
  let i = 0;
  const titleParts: string[] = [];
  // title + subtitle rows: label rows with at most one non-empty cell,
  // consumed only before any header/data content appears.
  while (i < lines.length) {
    if (isBlankRow(lines[i])) { i++; continue; }
    const nonEmpty = lines[i].filter((c) => c !== "");
    if (nonEmpty.length <= 1 && looksLikeLabelRow(lines[i])) {
      titleParts.push(nonEmpty[0]);
      i++;
      continue;
    }
    break;
  }
  // header: consecutive label rows (no cell that looks like a value).
  // Stops permanently at the first row that looks like data -- header never
  // resumes after data starts, so a later label-shaped row (e.g. a footnote
  // line) can't retroactively swallow rows that already rendered.
  let header: string[] | null = null;
  while (i < lines.length && looksLikeLabelRow(lines[i])) {
    if (!header) header = lines[i].map((c) => c);
    else header = header.map((h, idx) => [h, lines[i][idx]].filter(Boolean).join(" "));
    i++;
    while (i < lines.length && isBlankRow(lines[i])) i++;
  }
  const rows: string[][] = [];
  for (; i < lines.length; i++) {
    if (isBlankRow(lines[i])) continue;
    rows.push(lines[i]);
  }
  return { title: titleParts.join(" -- "), header: header ?? [], rows };
}

function leftmostNonEmpty(row: string[]): { value: string; index: number } | null {
  for (let idx = 0; idx < row.length; idx++) {
    if (row[idx] !== "") return { value: row[idx], index: idx };
  }
  return null;
}

interface RowSentence {
  subject: string;
  sentence: string;
}

interface StructuredProse {
  title: string | null;
  /** Exactly one entry per input data row -- 1:1, never merged, never
   *  dropped. Callers that need a conservation count use rowSentences.length
   *  directly; callers that need a subject-presence check read .subject
   *  directly instead of parsing the joined string back apart. */
  rowSentences: RowSentence[];
}

function renderTableAsProseStructured(gridText: string): StructuredProse {
  const { title, header, rows } = parseGrid(gridText);
  const rowSentences: RowSentence[] = [];

  let lastSubject = "";
  for (const row of rows) {
    const found = leftmostNonEmpty(row);
    // Defensive only -- rows reaching here are guaranteed non-blank by
    // parseGrid, so `found` should never be null. Carry-forward exists so a
    // pathological case still produces something instead of a silent drop.
    const subject = found ? found.value : lastSubject;
    const subjectIndex = found ? found.index : 0;
    if (found) lastSubject = subject;

    const parts: string[] = [];
    for (let c = 0; c < row.length; c++) {
      if (c === subjectIndex) continue;
      const val = row[c];
      if (!val) continue;
      const label = header[c] || `column ${c}`;
      parts.push(`${label} is ${val}`);
    }
    const subjectLabel = header[subjectIndex] || "value";
    if (parts.length) {
      rowSentences.push({ subject, sentence: `For ${subjectLabel} ${subject}: ${parts.join(", ")}.` });
    } else {
      // Row has a subject but no separate value cells (e.g. a pure marker
      // row). Still emit it -- never drop -- just without an "is" clause.
      rowSentences.push({ subject, sentence: `${subjectLabel} ${subject}.` });
    }
  }
  return { title: title || null, rowSentences };
}

function renderTableAsProse(gridText: string): string {
  const { title, rowSentences } = renderTableAsProseStructured(gridText);
  const sentences = [
    ...(title ? [`${title}.`] : []),
    ...rowSentences.map((r) => r.sentence),
  ];
  return sentences.join(" ");
}

export { parseGrid, renderTableAsProse, renderTableAsProseStructured, isDataRow, looksLikeValueCell };
