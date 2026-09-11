"""Per-page manifest assembly.

One PDF in, one JSON manifest per page out. Python never writes to Postgres --
the TS ingestion job reads these manifests and owns all persistence.

`extractionStatus` and `visualOnlyReason` are set STRUCTURALLY, from spec §1-2
outcomes, never by heuristic or learned score. `high_confidence_extraction` on
the TS side is true iff a page's status is EXTRACTED and every table on it is
EXTRACTED -- never true for an OCR'd page.
"""
import time

from . import tables as tables_mod
from . import validity as validity_mod

# extractionMethod
VECTOR_LINES = "VECTOR_LINES"
PADDLEOCR = "PADDLEOCR"
NONE = "NONE"

# extractionStatus
EXTRACTED = "EXTRACTED"
VISUAL_ONLY = "VISUAL_ONLY"

# visualOnlyReason -- one of the §1 validity failures, or a §2 region outcome.
#
# Phase 2 amendment 9: NO_CONFIDENT_REGION retired, replaced by REJECTED_REGION.
# The retired name conflated two different things -- "this page has no table"
# and "this page has a table we could not read." Only the second is visual-only.
# A page with zero candidate regions at all (no table on it) is not untrustworthy;
# its prose is extracted and it is EXTRACTED with visualOnlyReason=None. Only a
# page carrying at least one REJECTED region (amendment 2/3/6 fired on something)
# falls back to visual-only, because that is the case where a real table was
# found and could not be verified (spec §5).
REASON_EMPTY = "EMPTY"
REASON_UNMAPPED_GLYPH = "UNMAPPED_GLYPH"
REASON_DUPLICATE_TEXT = "DUPLICATE_TEXT"
REASON_REJECTED_REGION = "REJECTED_REGION"
REASON_SCANNED = "SCANNED"

# Amendment 10, live as of the region-exclusion + half-similarity follow-up.
# Decided in build_page_manifest, not validity.check_page -- the check needs
# confirmed §2 regions to score against (see detect_interleaved_lines'
# exclude_bboxes), so it structurally cannot run inside §1, which is defined
# to run before §2 exists. Same "unit is the page" consequence as every other
# reason here: a page with even one region-excluded, near-duplicate-filtered
# interleaved line pair (>= INTERLEAVE_PAGE_MIN_LINES) falls back to
# visual-only as a whole, same treatment as TABLE_LOCAL_CORRUPTION below.
REASON_INTERLEAVED_TEXT = "INTERLEAVED_TEXT"

# Amendment 10: table-local corruption is detected at region granularity (a
# single row within one table region on the page), not page granularity like
# every other reason above -- but the CONSEQUENCE is still page-level, same as
# REJECTED_REGION already is (a page carrying a rejected region falls back to
# visual-only as a whole; §1-4's "unit is the page" decision is unchanged,
# only where the *evidence* for the verdict is measured moved finer-grained).
# Given its own reason code rather than folding into the generic
# REJECTED_REGION bucket below, per the same precedent that retired
# NO_CONFIDENT_REGION for conflating two different causes -- a page rejected
# because its table's header is unreadable garbage is a different, more
# actionable fact than one rejected for being a decorative frame or empty
# region, and downstream (UI, retrieval) should be able to tell them apart.
REASON_TABLE_LOCAL_CORRUPTION = "TABLE_LOCAL_CORRUPTION"

# INTERLEAVED_TEXT deliberately absent -- validity.check_page() can no longer
# return that status (see validity.py's check_page docstring); it's decided
# in build_page_manifest after §2-4, not mapped from a validity_mod status.
_VALIDITY_TO_REASON = {
    validity_mod.EMPTY: REASON_EMPTY,
    validity_mod.UNMAPPED_GLYPH: REASON_UNMAPPED_GLYPH,
    validity_mod.DUPLICATE_TEXT: REASON_DUPLICATE_TEXT,
}


def build_page_manifest(page, page_index, heading=None, min_edge_length=None,
                        ocr_text=None, document_id=None):
    """Assemble one page's manifest.

    Order is fixed by the spec: §1 validity runs first and unconditionally; a
    page that fails it skips table extraction entirely (§5) -- and skips the
    interleaved-text check below too, same as it already skips table
    extraction, since neither can tell you anything new about a page already
    known untrustworthy. Table extraction never runs on an untrustworthy
    page, and character-ordering logic never runs outside a confirmed
    region. The interleaved-text check (Amendment 10) is a fourth step, run
    here rather than inside §1, after §2-4's regions are known -- see the
    comment at its call site below.
    """
    started = time.perf_counter()
    validity = validity_mod.check_page(page)

    manifest = {
        "documentId": document_id,
        "pageIndex": page_index,
        "pageNumber": page_index + 1,
        "width": float(page.width),
        "height": float(page.height),
        "validity": validity,
        "heading": heading or {},
        "tables": [],
        "rejectedRegions": [],
        "interleavedLines": [],
        "proseText": "",
        "ocrText": ocr_text or "",
        "extractionMethod": NONE,
        "extractionStatus": VISUAL_ONLY,
        "visualOnlyReason": None,
        "proseReliabilityReason": None,
    }

    if validity["status"] != validity_mod.VALID:
        # Untrustworthy page: no table extraction attempted (spec §5).
        manifest["visualOnlyReason"] = _VALIDITY_TO_REASON[validity["status"]]
        if ocr_text:
            manifest["extractionMethod"] = PADDLEOCR
            manifest["visualOnlyReason"] = REASON_SCANNED
        manifest["timingMs"] = round((time.perf_counter() - started) * 1000, 1)
        return manifest

    result = tables_mod.process_page(page, min_edge_length=min_edge_length)
    manifest["proseText"] = result["proseText"]
    manifest["rejectedRegions"] = result["rejected"]
    manifest["extractionMethod"] = VECTOR_LINES

    if result["status"] == tables_mod.EXTRACTED:
        manifest["tables"] = result["tables"]
        manifest["extractionStatus"] = EXTRACTED
    elif result["rejected"]:
        # At least one candidate region was found and rejected: a real table
        # was suspected and could not be verified. This is the only case spec
        # §5's fallback was meant to describe. TABLE_LOCAL_CORRUPTION takes
        # priority over the generic bucket when present -- it's a more
        # specific, more actionable cause (amendment 2 empty / amendment 3
        # frame / amendment 4 sparse all collapse to REJECTED_REGION, same as
        # before this change).
        manifest["extractionStatus"] = VISUAL_ONLY
        if any(r.get("reason") == "TABLE_LOCAL_CORRUPTION" for r in result["rejected"]):
            manifest["visualOnlyReason"] = REASON_TABLE_LOCAL_CORRUPTION
        else:
            manifest["visualOnlyReason"] = REASON_REJECTED_REGION
    else:
        # Zero candidate regions at all: this page simply has no table on it.
        # Its prose is trustworthy (validity passed) and is extracted normally.
        manifest["extractionStatus"] = EXTRACTED
        manifest["visualOnlyReason"] = None

    # Amendment 10, fourth check, run here rather than in validity.check_page
    # because it needs §2's confirmed regions to score against (both accepted
    # and rejected -- a rejected region's characters still flow to proseText,
    # so they must be excluded here too).
    region_bboxes = [t["bbox"] for t in manifest["tables"]] + [r["bbox"] for r in result["rejected"]]
    _, interleaved = validity_mod.detect_interleaved_lines(page, exclude_bboxes=region_bboxes)
    manifest["interleavedLines"] = interleaved
    if len(interleaved) >= validity_mod.INTERLEAVE_PAGE_MIN_LINES:
        # Amendment 11: an exception to "unit is the page" (spec §1's own
        # principle, reaffirmed by Amendment 10), not a reversal of it. A page
        # whose prose is scrambled is still not trustworthy as a PROSE
        # citation -- but if the page ALSO carries at least one confirmed,
        # clean TABLE region, and every flagged line's own bbox has zero 2D
        # overlap with every table's bbox (real geometry, not inferred from
        # exclude_bboxes already having removed in-table words -- a caption
        # beside a table, same Y, different X, would pass that removal but
        # still overlap the table's vertical span), the table itself was
        # never part of the corruption. Discarding it along with the prose
        # was never what "unit is the page" was for -- that principle exists
        # because a genuinely untrustworthy region contaminates everything
        # extracted alongside it (REJECTED_REGION, TABLE_LOCAL_CORRUPTION);
        # here the table and the corrupted prose are two independent regions
        # that happen to share a page, verified geometrically separate.
        #
        # Confirmed empirically, not assumed: canam-joist-catalog.pdf,
        # 47/47 table-bearing INTERLEAVED_TEXT pages have zero flagged-line/
        # table-bbox overlap page-wide -- this is not a narrow fit to one
        # page. See spec Amendment 11.
        table_bboxes = [t["bbox"] for t in manifest["tables"]]
        overlaps_a_table = any(
            _bboxes_overlap((f["x0"], f["top"], f["x1"], f["bottom"]), tb)
            for f in interleaved for tb in table_bboxes
        )
        if table_bboxes and not overlaps_a_table:
            manifest["proseReliabilityReason"] = REASON_INTERLEAVED_TEXT
            # extractionStatus/tables/visualOnlyReason are left exactly as
            # the table branch above already decided -- this is additive
            # metadata on top of that decision, not a new status path.
        else:
            manifest["extractionStatus"] = VISUAL_ONLY
            manifest["visualOnlyReason"] = REASON_INTERLEAVED_TEXT

    manifest["timingMs"] = round((time.perf_counter() - started) * 1000, 1)
    return manifest


def _bboxes_overlap(a, b):
    ax0, atop, ax1, abottom = a
    bx0, btop, bx1, bbottom = b
    return ax0 < bx1 and ax1 > bx0 and atop < bbottom and abottom > btop
