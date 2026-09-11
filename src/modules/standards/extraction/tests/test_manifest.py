"""Manifest-assembly (orchestration) fixtures. Amendment 10's INTERLEAVED_TEXT
is decided in build_page_manifest, not validity.check_page -- see that
function's docstring for why. This is the one thing test_validity.py and
test_tables.py's per-module fixtures can't verify on their own: that the
page-level status/reason actually land correctly once everything is wired
together end to end.
"""
from fabextract.manifest import (EXTRACTED, VISUAL_ONLY, REASON_INTERLEAVED_TEXT,
                                 REASON_TABLE_LOCAL_CORRUPTION, build_page_manifest)


def test_hilti_kb2_p0_manifest_is_visual_only_interleaved_text(docs):
    """Hilti_KB_2_ER_4627_2001_Feb.pdf, never ingested (held pending review).
    p0 has 0 table regions and 12 confirmed-interleaved lines -- end to end,
    the manifest must carry extractionStatus=VISUAL_ONLY,
    visualOnlyReason=INTERLEAVED_TEXT, not just the underlying detection
    function returning a count. Also pins the Amendment 11 negative case: with
    zero table regions, the exception can never apply (its own condition
    requires table_bboxes), so proseReliabilityReason must stay unset here --
    not merely "the page happens to have no tables", but confirming the
    exception's own guard is what keeps it from firing."""
    page = docs("hilti_kb2").pages[0]
    manifest = build_page_manifest(page, page_index=0)
    assert manifest["extractionStatus"] == VISUAL_ONLY
    assert manifest["visualOnlyReason"] == REASON_INTERLEAVED_TEXT
    assert len(manifest["interleavedLines"]) == 12
    assert manifest["proseReliabilityReason"] is None


def test_hilti_kb2_p2_manifest_is_visual_only_table_local_corruption(docs):
    """p2's two tables both reject as TABLE_LOCAL_CORRUPTION and it has no
    prose interleaving of its own -- the manifest must show the table reason,
    not the interleaved-text one, confirming the two don't get confused when
    both checks run on the same page."""
    page = docs("hilti_kb2").pages[2]
    manifest = build_page_manifest(page, page_index=2)
    assert manifest["extractionStatus"] == VISUAL_ONLY
    assert manifest["visualOnlyReason"] == REASON_TABLE_LOCAL_CORRUPTION


def test_hilti_kb2_p6_manifest_is_extracted_clean(docs):
    """Negative control: a page with a real, clean table and no interleaving
    must still come through as EXTRACTED -- the new fourth check must not
    fire on clean content."""
    page = docs("hilti_kb2").pages[6]
    manifest = build_page_manifest(page, page_index=6)
    assert manifest["extractionStatus"] == EXTRACTED
    assert manifest["visualOnlyReason"] is None
    assert manifest["interleavedLines"] == []
    assert manifest["proseReliabilityReason"] is None


# --- Amendment 11 -----------------------------------------------------------
#
# canam-joist-catalog.pdf's GLM dry-run surfaced the case Amendment 10's Hilti
# calibration never had to face: a page with a confirmed, clean table region
# PLUS interleaved-text lines that live entirely outside that region's bbox
# (unrelated footnote prose below/above the table). "Unit is the page" would
# discard the table along with the corrupted prose; Amendment 11 keeps the
# table EXTRACTED and moves the untrustworthy signal onto the PROSE chunk
# instead (manifest["proseReliabilityReason"]).

def test_canam_p72_manifest_extracted_with_reliability_flag(docs):
    """canam p72 (index 71), one of the 8 high-value K-Series-class pages
    identified in the GLM dry-run. Measured directly: 2 confirmed table
    regions, interleaved footnote prose entirely outside both. Amendment 11
    must keep extractionStatus=EXTRACTED (tables intact, not discarded) while
    flagging the page's prose via proseReliabilityReason -- the exact
    mixed-status outcome "unit is the page" alone could not express."""
    page = docs("canam").pages[71]
    manifest = build_page_manifest(page, page_index=71)
    assert manifest["extractionStatus"] == EXTRACTED
    assert manifest["visualOnlyReason"] is None
    assert len(manifest["tables"]) == 2
    assert manifest["proseReliabilityReason"] == REASON_INTERLEAVED_TEXT


def test_canam_full_document_amendment11_exception_count(docs):
    """Full 166-page regression, not just the calibration sample. Measured by
    full rerun: 47 pages hit the Amendment 11 exception (table region(s)
    confirmed clean, all interleaved lines geometrically outside every
    table's bbox) -- exactly matching GLM's original 47/56-region headline
    count. Includes all 8 high-value pages the dry-run flagged as
    high-value (72, 78, 81, 83, 85, 120, 121, 124)."""
    pages = docs("canam").pages
    exception_pages = []
    for i, page in enumerate(pages):
        manifest = build_page_manifest(page, page_index=i)
        if manifest["proseReliabilityReason"]:
            exception_pages.append(i + 1)
    assert len(exception_pages) == 47, f"exception count changed: {exception_pages}"
    for printed_page in (72, 78, 81, 83, 85, 120, 121, 124):
        assert printed_page in exception_pages, f"high-value page {printed_page} lost the exception"


def test_sji_full_document_zero_amendment11_exceptions(docs):
    """Direct confirmation the exception is additive, not a loosening: SJI's
    existing 16-page INTERLEAVED_TEXT residual (test_sji_full_document_
    interleaved_check_residual in test_validity.py) has no page shaped like
    canam's "clean table + footnote elsewhere" case, so re-running SJI's full
    240-page corpus through the Amendment 11 condition must find zero
    matches -- confirmed directly, not assumed from the residual's own
    characterization."""
    pages = docs("sji").pages
    exception_pages = []
    for i, page in enumerate(pages):
        manifest = build_page_manifest(page, page_index=i)
        if manifest["proseReliabilityReason"]:
            exception_pages.append(i + 1)
    assert exception_pages == []
