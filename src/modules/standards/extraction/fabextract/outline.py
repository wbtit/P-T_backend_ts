"""Build item 2 -- heading detection. Per-page provenance, gates on both sources,
and null as an acceptable outcome.

Heading source is per PAGE, not per document: OUTLINE, REGEX, or NULL. Both
sources may appear within one document. Nothing is invented -- a page with no
trusted heading gets null, and chunking proceeds with heading=null rather than
falling back to a document title or carrying a heading across a page boundary.

Three gates, each measured:

1. Only outline entries resolving to a page destination INSIDE this document
   count. Measured: aisc-14th has 1673 entries in the tree, of which 1662
   resolve; 11 return no destination without raising.

2. OUTLINE FORWARD-FILL GATE. Forward-fill is trusted only when the outline
   actually describes the document -- resolved entry count against page count.
   This rule exists because the resolve-in-document rule alone does NOT do what
   it was expected to: the 43rd Edition SJI catalog has 2 of 5 errata entries
   that DO resolve, so without this gate 'Eratta One' forward-fills onto 6 real
   load-table pages. With the gate, SJI's ratio (2/240) fails, fill is off, the
   2 errata pages keep their own correct headings, and the load tables get null.

3. NO page-count reset threshold on the outline path. The 36-page reset exists
   because regex detection fails OPEN -- a missed heading propagates until the
   next accidental match, which is how one bug once reached 642 pages. Outline
   forward-fill fails CLOSED: it terminates at the next entry by construction.
   Applying the reset here would truncate genuine spans -- on AISC it would cut
   Table 6-1 (90 pages, "(continued)" confirmed mid-run), Tables 7-6..7-13 (48)
   and Table 3-6 (45), orphaning ~75 pages that currently get the right heading.

REGEX GATES. The AISC regex fails open, confirmed twice: Marvin Metals' `N)`
convention, and Expansion_Anchor, where 'Installation' inside the body-text
fragment '4.Theanchorbearsalength Installation' matched and propagated to 13 of
15 pages while noHeadingsDetected reported False. Two gates now guard it, and
failing either discards EVERY regex heading in that document -- never a partial
keep. The pattern itself is unchanged; these are gates around it.
"""
import re

import pypdf

from .tables import segment_chars

# Retained for the REGEX fallback path only -- see module docstring.
REGEX_HEADING_RESET_PAGES = 36

# Gate 2: DISTINCT START PAGES / total pages -- how much of the document the
# outline actually points at, before any fill.
#
# Not entry count / pages: that measure is unbounded above 1.0 for a dense
# outline (several entries can share one start page), so it conflates "describes
# the document" with "has many entries". The two readings diverge materially on
# AISC -- 1662/2325 = 0.715 by entry count versus 821/2325 = 0.353 by distinct
# start pages.
#
# Threshold 0.10. Measured: AISC 0.353 (fill on), completeconnectiondetails
# 0.964 (fill on), 43rd Edition SJI 0.0083 (fill off -- 2 errata entries in a
# 240-page catalog).
OUTLINE_FILL_MIN_COVERAGE = 0.10

# Gate 3b: one match is noise, not a convention.
REGEX_MIN_DISTINCT_MATCHES = 3

# AISC's `\d{1,2}.[A-Z]` section convention. Known not to generalise; that is
# why outline-first exists and why the gates above are mandatory.
AISC_HEADING_RE = re.compile(r'^(\d{1,2}\.[A-Z][\w \t\-,/()]{2,80})[ \t]*$')

SOURCE_OUTLINE = "OUTLINE"
SOURCE_REGEX = "REGEX"
SOURCE_NULL = "NULL"


def _null_heading():
    return {"heading": None, "breadcrumb": [], "depth": None,
            "headingSource": SOURCE_NULL, "isLeaf": None,
            "runLength": None, "runStartPage": None}


def read_outline(reader):
    """Flatten a pypdf outline, keeping only entries that resolve to a page
    destination inside this document.

    Returns (entries, n_unresolved). Each entry:
        {depth, title, page (0-indexed), isLeaf, ancestors[]}
    """
    entries = []
    unresolved = 0

    def walk(node, depth, ancestors):
        nonlocal unresolved
        i = 0
        while i < len(node):
            item = node[i]
            if isinstance(item, list):
                i += 1
                continue
            has_children = (i + 1 < len(node)) and isinstance(node[i + 1], list)
            title = str(getattr(item, "title", "") or "").strip()
            try:
                page = reader.get_destination_page_number(item)
            except Exception:
                page = None
            if page is None:
                # Attachment / launch / external destination, or a destination
                # that resolves to nothing. Does not count.
                unresolved += 1
            else:
                entries.append({
                    "depth": depth, "title": title, "page": page,
                    "isLeaf": not has_children, "ancestors": list(ancestors),
                })
            if has_children:
                walk(node[i + 1], depth + 1, ancestors + [title])
                i += 2
            else:
                i += 1

    try:
        outline = reader.outline
    except Exception:
        return [], 0
    if not outline:
        return [], 0
    walk(outline, 1, [])
    return entries, unresolved


def outline_coverage(entries, n_pages):
    """Gate-2 input: DISTINCT START PAGES / page count.

    Returns (coverage, distinct_start_pages, entry_count_ratio). The third value
    is the rejected entry-count reading, reported for audit only -- it is not
    the gate.
    """
    if n_pages <= 0:
        return 0.0, 0, 0.0
    distinct_start_pages = len({e["page"] for e in entries})
    return distinct_start_pages / n_pages, distinct_start_pages, len(entries) / n_pages


def build_page_headings(entries, n_pages, forward_fill=True):
    """Map outline entries onto pages.

    With forward_fill=True each page takes the deepest entry starting at or
    before it, until the next entry starts. With forward_fill=False an entry
    applies ONLY to its own start page and every other page is null -- that is
    what the coverage gate switches off.
    """
    if not entries:
        return [_null_heading() for _ in range(n_pages)]

    deepest_by_page = {}
    for e in entries:
        cur = deepest_by_page.get(e["page"])
        if cur is None or e["depth"] > cur["depth"]:
            deepest_by_page[e["page"]] = e

    covering = [None] * n_pages
    current = None
    for p in range(n_pages):
        if p in deepest_by_page:
            current = deepest_by_page[p]
            covering[p] = current
        elif forward_fill:
            covering[p] = current
        else:
            covering[p] = None

    run_len, run_start = {}, {}
    p = 0
    while p < n_pages:
        e = covering[p]
        q = p
        while q + 1 < n_pages and covering[q + 1] is e:
            q += 1
        if e is not None:
            run_len[id(e)] = run_len.get(id(e), 0) + (q - p + 1)
            run_start.setdefault(id(e), p)
        p = q + 1

    out = []
    for p in range(n_pages):
        e = covering[p]
        if e is None:
            out.append(_null_heading())
        else:
            out.append({
                "heading": e["title"],
                "breadcrumb": list(e["ancestors"]),
                "depth": e["depth"],
                "headingSource": SOURCE_OUTLINE,
                "isLeaf": e["isLeaf"],
                "runLength": run_len.get(id(e)),
                "runStartPage": run_start.get(id(e)),
            })
    return out


def find_regex_headings(plumber_pages, candidate_pages=None):
    """Gate 3a: a match must be LINE-INITIAL on a Y-clustered line. A mid-line
    fragment is not a heading -- 'Installation' inside
    '4.Theanchorbearsalength Installation' must not match. Confirmed: that
    fragment matches the ungated pattern and does NOT match this one.

    `candidate_pages` restricts the scan to the pages the regex could actually
    fill (those the outline left null). This is a cost decision, not a semantic
    one: Y-clustering all 2325 AISC pages costs ~149s to evaluate a path that
    can only ever write to its 11 null front-matter pages. Pages the outline
    already covers are never overwritten by regex, so they cannot contribute a
    heading either way. Pass None to scan the whole document.

    Returns a list, one entry per page, of the first line-initial match on that
    page (or None).
    """
    per_page = []
    for i, page in enumerate(plumber_pages):
        if candidate_pages is not None and i not in candidate_pages:
            per_page.append(None)
            continue
        text, _ = segment_chars(page.chars)
        match = None
        for line in text.split("\n"):
            m = AISC_HEADING_RE.match(line.strip())
            if m:
                match = m.group(1).strip()
                break
        per_page.append(match)
    return per_page


def apply_regex_headings(per_page_matches, n_pages):
    """Gate 3b plus the reset. Requires >= REGEX_MIN_DISTINCT_MATCHES distinct
    matches across the document; if that fails, EVERY regex heading in the
    document is discarded -- never a partial keep.

    The 36-page reset still applies on this path, where detection fails open.
    """
    distinct = {m for m in per_page_matches if m}
    if len(distinct) < REGEX_MIN_DISTINCT_MATCHES:
        return [_null_heading() for _ in range(n_pages)], len(distinct), False

    out = []
    carried, since = None, 0
    for i in range(n_pages):
        m = per_page_matches[i] if i < len(per_page_matches) else None
        if m:
            carried, since = m, 0
        else:
            since += 1
            if since >= REGEX_HEADING_RESET_PAGES:
                carried = None
        if carried:
            out.append({"heading": carried, "breadcrumb": [], "depth": None,
                        "headingSource": SOURCE_REGEX, "isLeaf": None,
                        "runLength": None, "runStartPage": None})
        else:
            out.append(_null_heading())
    return out, len(distinct), True


def regex_headings_for_page(page_text, carried_heading, pages_since_heading):
    """Single-page regex step, kept for the reset-behaviour test. Gate 3a is
    applied by matching line-initially against already-split lines."""
    match = None
    for line in (page_text or "").split("\n"):
        m = AISC_HEADING_RE.match(line.strip())
        if m:
            match = m.group(1).strip()
            break
    if match:
        return match, 0
    pages_since_heading += 1
    if pages_since_heading >= REGEX_HEADING_RESET_PAGES:
        return None, pages_since_heading
    return carried_heading, pages_since_heading


def detect_headings(pdf_path, plumber_pages=None):
    """Per-page heading detection for a whole document.

    Returns (per_page_headings, meta). meta reports the measured gate inputs so
    every decision is auditable: outlineCoverageRatio, outlineFillApplied,
    regexDistinctMatches, regexTrusted, headingCoverageRatio, noHeadingsDetected.

    noHeadingsDetected reflects TRUSTED headings only -- it goes true when a
    document ends with zero OUTLINE and zero trusted-REGEX headings.
    """
    reader = pypdf.PdfReader(str(pdf_path))
    n_pages = len(reader.pages)
    entries, n_unresolved = read_outline(reader)

    coverage, distinct_start_pages, entry_ratio = outline_coverage(entries, n_pages)
    meta = {
        "outlineEntriesInTree": len(entries) + n_unresolved,
        "outlineEntriesResolved": len(entries),
        "outlineUnresolved": n_unresolved,
        "outlineCoverageRatio": round(coverage, 4),
        "outlineDistinctStartPages": distinct_start_pages,
        # Rejected reading, kept for audit: unbounded above 1.0 on dense outlines.
        "outlineEntryCountRatio": round(entry_ratio, 4),
        "outlineFillApplied": False,
        "regexDistinctMatches": 0,
        "regexTrusted": False,
    }

    headings = [_null_heading() for _ in range(n_pages)]

    if entries:
        fill = coverage >= OUTLINE_FILL_MIN_COVERAGE
        meta["outlineFillApplied"] = fill
        headings = build_page_headings(entries, n_pages, forward_fill=fill)

    # Regex only fills pages the outline left null, and only if it clears its
    # gates. It is never run to overwrite an outline heading.
    null_pages = {i for i, h in enumerate(headings) if h["heading"] is None}
    if plumber_pages is not None and null_pages:
        matches = find_regex_headings(plumber_pages, candidate_pages=null_pages)
        regex_headings, n_distinct, trusted = apply_regex_headings(matches, n_pages)
        meta["regexDistinctMatches"] = n_distinct
        meta["regexTrusted"] = trusted
        if trusted:
            for i in range(n_pages):
                if headings[i]["heading"] is None and regex_headings[i]["heading"]:
                    headings[i] = regex_headings[i]

    n_with = sum(1 for h in headings if h["heading"])
    runs = [h["runLength"] for h in headings if h["runLength"]]
    meta["headingCoverageRatio"] = round(n_with / n_pages, 4) if n_pages else 0.0
    meta["pagesWithoutHeading"] = n_pages - n_with
    meta["maxRunLength"] = max(runs) if runs else 0
    meta["noHeadingsDetected"] = n_with == 0
    if entries:
        last = max(entries, key=lambda e: e["page"])
        meta["lastEntryTitle"] = last["title"]
        meta["lastEntryStartPage"] = last["page"]
        meta["lastEntryRunLength"] = n_pages - last["page"] if meta["outlineFillApplied"] else 1
    return headings, meta
