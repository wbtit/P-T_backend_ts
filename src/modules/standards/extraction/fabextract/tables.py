"""Spec §2-4 -- mandatory table-region detection, selective row refinement, and
character-to-cell assignment/ordering, plus the Phase 2 amendments.

Carried over from the Stage 1-5 benchmark module pipeline_stage4.py without
behavioural change; every threshold traces to a real failure on a real document
(see spec §2-4 and the Phase 2 amendments section). The only additions are
reporting fields the manifest needs (refinementApplied, rowHeightRatio) and
prose extraction for characters outside any accepted table region.

Do not "improve" the ordering or merge rules here. Each one is load-bearing and
pinned by tests/test_tables.py.
"""
from statistics import median

from .validity import UNMAPPED_DOMINANCE_THRESHOLD, is_unmapped_char

SIZE_REL_THRESH = 0.15
SIZE_ABS_THRESH = 0.6
WORD_GAP_FACTOR = 0.35
NEWLINE_GAP_FACTOR = 0.55
MIN_CONFIDENT_ROWS = 2
MIN_CONFIDENT_COLS = 2

# Refinement (text-gap row splitting within a lines-confirmed region) should only be
# attempted when the region's rows look genuinely under-segmented -- i.e. each
# detected row is tall enough to plausibly contain several real lines of text merged
# together (AISC's pattern: ~4.4-4.6x a single line height). A region whose rows are
# already close to one line's height (Expansion_Anchor: ~2.0x) is already
# well-segmented by the real grid lines alone; forcing refinement there was found to
# fragment legitimate multi-line cells (e.g. "DESIGN\nINFORMATION" split into two
# spurious rows) instead of helping.
UNDERSEGMENTATION_RATIO_THRESHOLD = 2.5

# Phase 2 amendment 1 -- minimum edge length, a SECONDARY guard to the >=2x2
# vector-line gate, not the primary mechanism. Applied by pdfplumber AFTER its
# own snap/join tolerances merge dashed/segmented rules into continuous lines --
# never against raw pre-join edges, which would chop legitimate short segments
# before they get joined into a real line.
#
# DEFAULT DISABLED (None). Measured: this filter closes nothing on its own
# anywhere in the fixture suite -- 0 of 25 fixtures differ between disabled and
# 8pt. PLANT GAGES, its motivating case, already defers correctly via the >=2x2
# gate with zero length filtering. Against that zero benefit the risk is real:
# NewmillCatalog p180's legitimate per-cell dividers are 8.32-8.89pt, inside
# PLANT GAGES' 0-19pt decorative-noise range, so any threshold >=9 silently
# merges real columns under a passing status. Set to a number to enable.
MIN_EDGE_LENGTH_FILTER = None

# Phase 2 amendment 3 -- a candidate region whose bbox covers most of the page's
# height while staying narrow in structure (<=3 rows, <=3 cols) is a page
# frame/border mistaken for a table. Real full-page AISC tables have many rows
# and columns and pass this untouched. Rejection rule, not an extraction attempt:
# rejected regions' characters flow to proseText.
FRAME_HEIGHT_FRACTION_THRESHOLD = 0.8
FRAME_MAX_ROWS = 3
FRAME_MAX_COLS = 3

# Phase 2 amendment 4 -- minimum content. Amendment 2 rejects a region with
# ZERO non-empty cells; this rejects one that clears that bar but carries almost
# no text at all. Measured across all 50 EXTRACTED regions in the corpus, by
# non-whitespace character count: {2, 4} then a gap to {53, 56, 70, ...}.
# 20 sits 5x above the largest rejected and 2.65x below the smallest kept.
#
# Cell count was measured as the alternative metric and REJECTED: legitimate
# single-cell regions exist (Newmill p180's spec box, 53 chars; Expansion_Anchor
# p12's instruction text, 56 chars), so any cell-count threshold >= 2 destroys
# real content. Character count is the metric that separates cleanly.
MIN_REGION_NONWS_CHARS = 20

EXTRACTED = "EXTRACTED"
FALLBACK_SHOW_IMAGE = "FALLBACK_SHOW_IMAGE"


def _table_settings(vertical, horizontal, min_edge_length):
    settings = {"vertical_strategy": vertical, "horizontal_strategy": horizontal}
    if min_edge_length is not None:
        settings["edge_min_length"] = min_edge_length
    return settings


def _max_cols(table_obj):
    """Robust column count: the max cells-per-row across ALL rows, not just row 0
    (row 0 -- often a header -- can have a merged/reduced cell count that doesn't
    reflect the table's real column count)."""
    if not table_obj.rows:
        return 0
    return max(len(r.cells) for r in table_obj.rows)


def detect_table_regions(page, min_edge_length=None):
    """Find ALL of the page's table regions using ONLY real vector lines on both
    axes (vertical_strategy='lines', horizontal_strategy='lines') -- text-gap-based
    detection is deliberately excluded from this confidence gate, since it's what
    produced PLANT GAGES' false-positive over-inclusive region in Stage 3. A page
    can legitimately contain more than one table (e.g. AISC's inches + metric
    tables stacked on one page) -- every confident candidate is returned, sorted
    top-to-bottom, not just the largest. Returns [] if none meet the minimum-
    confidence bar (>=2 rows and >=2 columns from real lines alone)."""
    try:
        tables = page.find_tables(table_settings=_table_settings("lines", "lines", min_edge_length))
    except Exception:
        return []
    candidates = [t for t in tables
                  if len(t.rows) >= MIN_CONFIDENT_ROWS and _max_cols(t) >= MIN_CONFIDENT_COLS]
    candidates.sort(key=lambda t: t.bbox[1])
    return candidates


def refine_rows_within_region(page, region, min_edge_length=None):
    """Given a confirmed region (bbox trusted via detect_table_regions), re-run
    table-finding with horizontal_strategy='text' to recover individually-
    whitespace-separated rows (AISC's pattern) where the outer lines-only
    detection under-segmented them.

    Returns (region, row_height_ratio, refinement_applied). Behaviour is
    unchanged from the benchmark module; the extra return values are reporting
    only.
    """
    x0, top, x1, bottom = region.bbox
    orig_area = (x1 - x0) * (bottom - top)

    region_chars = [c for c in page.chars if x0 <= c["x0"] <= x1 and top <= c["top"] <= bottom]
    if not region_chars:
        return region, None, False
    med_size = median(c["size"] for c in region_chars)
    avg_row_height = (bottom - top) / len(region.rows) if region.rows else 0
    ratio = (avg_row_height / (med_size * 1.15)) if med_size > 0 else None
    if med_size <= 0 or ratio < UNDERSEGMENTATION_RATIO_THRESHOLD:
        return region, ratio, False  # rows already well-segmented -- don't force refinement

    # Refine on the FULL page (not a pre-cropped sub-page): cropping first was found
    # to disrupt pdfplumber's own edge detection near the crop boundary, causing it
    # to lock onto a smaller, wrong sub-region (seen on AISC's J3.3M table: an
    # in-crop refinement found a narrower candidate missing the leftmost column and
    # covering only ~60% of the table's height, which silently discarded real data
    # when trusted).
    tables = page.find_tables(table_settings=_table_settings("lines", "text", min_edge_length))
    candidates = [t for t in tables
                  if len(t.rows) >= MIN_CONFIDENT_ROWS and _max_cols(t) >= MIN_CONFIDENT_COLS]

    def _overlap_fracs(t):
        tx0, ttop, tx1, tbottom = t.bbox
        t_area = (tx1 - tx0) * (tbottom - ttop)
        ox = max(0, min(x1, tx1) - max(x0, tx0))
        oy = max(0, min(bottom, tbottom) - max(top, ttop))
        overlap = ox * oy
        return (overlap / orig_area if orig_area else 0), (overlap / t_area if t_area else 0)

    # Require overlap on BOTH sides: the refined candidate must cover the original
    # region (>=70% of its area) AND not extend much beyond it (>=70% of the
    # refined candidate's OWN area must also be inside the original) -- one-sided
    # containment alone let a refinement balloon outward to swallow surrounding
    # title/description text (seen on canam: a "refined" candidate expanded from
    # the real 18x22 load table into a 72x25 region that absorbed page titles).
    candidates = [t for t in candidates if all(f >= 0.7 for f in _overlap_fracs(t))]
    if not candidates:
        return region, ratio, False
    refined = max(candidates, key=lambda t: len(t.rows))
    if _max_cols(refined) < _max_cols(region):
        return region, ratio, False  # refinement lost columns -- distrust it, keep original
    return refined, ratio, True


# ---------- character ordering (spec §4) ----------

def cluster_lines(chars):
    """Y-proximity first, then x0 within each line -- NOT a global x0-primary
    sort. Cross-line merging is gated on a genuine font-size transition; same-size
    adjacent lines never merge on proximity alone (canam's "298"/"171")."""
    if not chars:
        return []
    chars_sorted = sorted(chars, key=lambda c: (c["top"], c["x0"]))
    lines = [[chars_sorted[0]]]
    line_top = chars_sorted[0]["top"]
    line_bottom = chars_sorted[0]["bottom"]
    line_sizes = {round(chars_sorted[0]["size"], 1)}
    for c in chars_sorted[1:]:
        overlap_amount = min(c["bottom"], line_bottom) - max(c["top"], line_top)
        overlaps = overlap_amount > 0.1
        line_height = (line_bottom - line_top) or c["size"]
        gap_below = c["top"] - line_bottom
        c_size = round(c["size"], 1)
        size_differs_from_line = all(
            abs(c["size"] - s) > SIZE_ABS_THRESH and abs(c["size"] - s) / max(c["size"], s) > SIZE_REL_THRESH
            for s in line_sizes
        )
        if overlaps:
            same_line = True
        elif size_differs_from_line:
            same_line = gap_below <= line_height * NEWLINE_GAP_FACTOR
        else:
            same_line = False
        if same_line:
            lines[-1].append(c)
            line_top = min(line_top, c["top"])
            line_bottom = max(line_bottom, c["bottom"])
            line_sizes.add(c_size)
        else:
            lines.append([c])
            line_top, line_bottom = c["top"], c["bottom"]
            line_sizes = {c_size}
    for line in lines:
        line.sort(key=lambda c: c["x0"])
    return lines


def segment_chars(chars):
    """Join clustered lines into text. A font-size transition inserts a space and
    is recorded (that's the fraction merge: "1" + "1/4" -> "1 1/4"); a plain word
    gap inserts a space too."""
    if not chars:
        return "", []
    lines = cluster_lines(chars)
    out_lines = []
    transitions = []
    for line in lines:
        out = []
        prev = None
        for c in line:
            if prev is None:
                out.append(c["text"])
            else:
                size_delta = abs(c["size"] - prev["size"])
                size_transition = (
                    size_delta > SIZE_ABS_THRESH
                    and size_delta / max(prev["size"], c["size"]) > SIZE_REL_THRESH
                )
                gap = c["x0"] - prev["x1"]
                avg_w = (prev["width"] + c["width"]) / 2 or 1
                word_gap = gap > avg_w * WORD_GAP_FACTOR
                if size_transition:
                    out.append(" ")
                    transitions.append((len("".join(out)), prev["size"], c["size"]))
                elif word_gap and gap > 1.0:
                    out.append(" ")
                out.append(c["text"])
            prev = c
        out_lines.append("".join(out))
    return "\n".join(out_lines), transitions


def extract_table_grid(table_obj, chars):
    grid = []
    all_transitions = []
    for row in table_obj.rows:
        row_cells = []
        for cell_bbox in row.cells:
            if cell_bbox is None:
                row_cells.append("")
                continue
            cx0, ctop, cx1, cbottom = cell_bbox
            cell_chars = [
                ch for ch in chars
                if cx0 <= (ch["x0"] + ch["x1"]) / 2 <= cx1
                and ctop <= (ch["top"] + ch["bottom"]) / 2 <= cbottom
            ]
            text, transitions = segment_chars(cell_chars)
            all_transitions.extend(transitions)
            row_cells.append(text)
        grid.append(row_cells)
    return grid, all_transitions


def _row_chars(row, region_chars):
    out = []
    for cell_bbox in row.cells:
        if cell_bbox is None:
            continue
        cx0, ctop, cx1, cbottom = cell_bbox
        out.extend(ch for ch in region_chars
                   if cx0 <= (ch["x0"] + ch["x1"]) / 2 <= cx1
                   and ctop <= (ch["top"] + ch["bottom"]) / 2 <= cbottom)
    return out


def check_table_region_corruption(refined, region_chars, threshold=UNMAPPED_DOMINANCE_THRESHOLD):
    """Spec Amendment 10 -- a table's page-wide unmapped-glyph ratio can sit well
    under §1's 15% page threshold while one row (typically the header) is
    entirely unmapped-glyph garbage, diluted by the table's own clean data
    rows plus the rest of the page's clean text. Checked per row, reusing §1's
    own is_unmapped_char/threshold -- not a new number, the same 15% applied at
    a finer grain. Returns the first corrupted row found as
    (row_index, ratio, n_chars, n_unmapped), or None if every row is clean.

    Confirmed on Hilti_KB_2_ER_4627 p2: page-wide ratio 12.45% (under 15%,
    passes §1), while both detected tables' header rows are 100% unmapped --
    exactly the dilution this check exists to catch."""
    for i, row in enumerate(refined.rows):
        rchars = [c for c in _row_chars(row, region_chars) if c.get("text", "").strip()]
        if not rchars:
            continue
        n_unmapped = sum(1 for c in rchars if is_unmapped_char(c.get("text", "")))
        ratio = n_unmapped / len(rchars)
        if ratio >= threshold:
            return i, ratio, len(rchars), n_unmapped
    return None


def _is_frame_region(page, region):
    x0, top, x1, bottom = region.bbox
    height = bottom - top
    return (
        page.height > 0
        and height / page.height >= FRAME_HEIGHT_FRACTION_THRESHOLD
        and len(region.rows) <= FRAME_MAX_ROWS
        and _max_cols(region) <= FRAME_MAX_COLS
    )


def _char_in_bbox(c, bbox):
    x0, top, x1, bottom = bbox
    return (x0 <= (c["x0"] + c["x1"]) / 2 <= x1) and (top <= (c["top"] + c["bottom"]) / 2 <= bottom)


def process_page(page, min_edge_length=MIN_EDGE_LENGTH_FILTER):
    """The ONLY sanctioned entry point for table extraction: character-ordering
    logic never runs without first passing through detect_table_regions. Never
    call segment_chars/extract_table_grid directly on a whole page.

    Processes EVERY confident region, then applies the region-level rejections
    (amendments 2, 3, 4, and 10 -- numbered per this file's own inline
    comments; the spec document numbers the amendment-4 sparse-region rule as
    6, a pre-existing drift between code comments and the spec noticed while
    adding amendment 10, not fixed here -- out of scope for this change).
    A page whose every candidate is rejected falls to FALLBACK_SHOW_IMAGE,
    same as a page with zero candidates.

    Returns {status, reason, tables[], rejected[], proseText}. Characters outside
    every ACCEPTED table region -- including those inside rejected regions --
    become proseText.
    """
    regions = detect_table_regions(page, min_edge_length=min_edge_length)
    if not regions:
        prose, _ = segment_chars(page.chars)
        return {"status": FALLBACK_SHOW_IMAGE,
                "reason": "no confident table region (< 2x2 real vector-line grid)",
                "tables": [], "rejected": [], "proseText": prose}

    tables_out = []
    rejected = []
    for region in regions:
        # Amendment 3: reject page-frame/border regions before spending refinement
        # and character-assignment work on them.
        if _is_frame_region(page, region):
            rejected.append({"bbox": list(region.bbox),
                             "reason": "FRAME_REGION",
                             "detail": "covers most of page height with <=3x3 structure"})
            continue

        refined, row_height_ratio, refinement_applied = refine_rows_within_region(
            page, region, min_edge_length=min_edge_length)
        region_chars = [c for c in page.chars if _char_in_bbox(c, refined.bbox)]
        grid, transitions = extract_table_grid(refined, region_chars)

        # Amendment 10: a row (typically the header) can be entirely
        # unmapped-glyph garbage while the table's page-wide ratio stays under
        # §1's 15% threshold, diluted by clean data rows. Checked before the
        # emptiness/sparseness rejections below -- a corrupted header still has
        # "non-empty" cells (they're just unreadable), so those checks alone
        # would not catch it.
        corruption = check_table_region_corruption(refined, region_chars)
        if corruption is not None:
            row_idx, ratio, n_row_chars, n_row_unmapped = corruption
            rejected.append({"bbox": list(refined.bbox),
                             "reason": "TABLE_LOCAL_CORRUPTION",
                             "detail": f"row {row_idx} is {ratio:.2%} unmapped glyphs "
                                       f"({n_row_unmapped}/{n_row_chars} chars) -- page-wide "
                                       f"ratio would dilute this below the {UNMAPPED_DOMINANCE_THRESHOLD:.0%} threshold"})
            continue

        # Amendment 2: a region with zero non-empty cells is not a table --
        # decorative vector-line grids elsewhere on the page (AISC 1100, 1444)
        # can pass the >=2x2 gate while holding no text at all. Region-level
        # rejection; the page's real table(s) are unaffected.
        if sum(1 for row in grid for c in row if c.strip()) == 0:
            rejected.append({"bbox": list(refined.bbox),
                             "reason": "EMPTY_REGION",
                             "detail": "zero non-empty cells"})
            continue

        # Amendment 4: a region that clears the >=2x2 gate and has at least one
        # non-empty cell, but carries almost no text, is not a table we
        # extracted -- it is a figure, or a table we failed to read. Spec §5:
        # never assert a number from a table we cannot verify.
        n_nonws = sum(len("".join(c.split())) for row in grid for c in row)
        if n_nonws < MIN_REGION_NONWS_CHARS:
            rejected.append({"bbox": list(refined.bbox),
                             "reason": "SPARSE_REGION",
                             "detail": f"{n_nonws} non-whitespace chars < {MIN_REGION_NONWS_CHARS}"})
            continue

        tables_out.append({
            "bbox": list(refined.bbox),
            "status": EXTRACTED,
            "refinementApplied": refinement_applied,
            "rowHeightRatio": row_height_ratio,
            "nRows": len(refined.rows),
            "nCols": len(refined.rows[0].cells) if refined.rows else 0,
            "cells": grid,
            "transitions": transitions,
        })

    accepted_bboxes = [t["bbox"] for t in tables_out]
    prose_chars = [c for c in page.chars
                   if not any(_char_in_bbox(c, bb) for bb in accepted_bboxes)]
    prose, _ = segment_chars(prose_chars)

    if not tables_out:
        return {"status": FALLBACK_SHOW_IMAGE,
                "reason": "all candidate regions rejected (empty and/or frame)",
                "tables": [], "rejected": rejected, "proseText": prose}

    return {"status": EXTRACTED, "reason": "ok",
            "tables": tables_out, "rejected": rejected, "proseText": prose}
