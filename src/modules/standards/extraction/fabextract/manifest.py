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

_VALIDITY_TO_REASON = {
    validity_mod.EMPTY: REASON_EMPTY,
    validity_mod.UNMAPPED_GLYPH: REASON_UNMAPPED_GLYPH,
    validity_mod.DUPLICATE_TEXT: REASON_DUPLICATE_TEXT,
}


def build_page_manifest(page, page_index, heading=None, min_edge_length=None,
                        ocr_text=None, document_id=None):
    """Assemble one page's manifest.

    Order is fixed by the spec: §1 validity runs first and unconditionally; a
    page that fails it skips table extraction entirely (§5). Table extraction
    never runs on an untrustworthy page, and character-ordering logic never runs
    outside a confirmed region.
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
        "proseText": "",
        "ocrText": ocr_text or "",
        "extractionMethod": NONE,
        "extractionStatus": VISUAL_ONLY,
        "visualOnlyReason": None,
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
        # At least one candidate region was found and rejected (amendment
        # 2/3/6): a real table was suspected and could not be verified. This is
        # the only case spec §5's fallback was meant to describe.
        manifest["extractionStatus"] = VISUAL_ONLY
        manifest["visualOnlyReason"] = REASON_REJECTED_REGION
    else:
        # Zero candidate regions at all: this page simply has no table on it.
        # Its prose is trustworthy (validity passed) and is extracted normally.
        manifest["extractionStatus"] = EXTRACTED
        manifest["visualOnlyReason"] = None

    manifest["timingMs"] = round((time.perf_counter() - started) * 1000, 1)
    return manifest
