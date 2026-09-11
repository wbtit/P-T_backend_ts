"""Spec §1 fixtures. Every expected value here was measured on a real run and
is recorded in the Phase 2 amendments; none are invented.

The full-document scans are marked `slow` -- they take minutes. The fast subset
runs after every change.
"""
import pytest

from fabextract.tables import process_page
from fabextract.validity import (DUPLICATE_TEXT, EMPTY, UNMAPPED_GLYPH, VALID,
                                 check_page, detect_duplicate_text,
                                 detect_interleaved_lines)

# 43rd Edition SJI: cover/divider/blank pages fail, load-table pages pass.
# Measured: 233 pass / 7 fail out of 240.
SJI_FAIL_PAGES = [1, 5, 21, 22, 25, 239, 240]
SJI_EXPECT = {1: UNMAPPED_GLYPH, 5: EMPTY, 21: UNMAPPED_GLYPH, 22: UNMAPPED_GLYPH,
              25: UNMAPPED_GLYPH, 239: EMPTY, 240: EMPTY}

# The 6 letter-doubled pages ("SSPPAANN"), with their measured overlap ratios.
SJI_DUPLICATE_PAGES = {10: 0.033599, 26: 0.043536, 115: 0.366412,
                       192: 0.030221, 193: 0.036641, 194: 0.040343}


@pytest.mark.parametrize("page_no,expected_status", sorted(SJI_EXPECT.items()))
def test_sji_known_bad_pages_fail_validity(docs, page_no, expected_status):
    page = docs("sji").pages[page_no - 1]
    assert check_page(page)["status"] == expected_status


@pytest.mark.parametrize("page_no", [51, 121, 151, 201])
def test_sji_load_table_pages_pass_validity(docs, page_no):
    """Per-page, never per-document: good pages in a document with bad ones pass."""
    assert check_page(docs("sji").pages[page_no - 1])["status"] == VALID


@pytest.mark.parametrize("page_no,expected_ratio", sorted(SJI_DUPLICATE_PAGES.items()))
def test_sji_doubled_pages_fail_duplicate_check(docs, page_no, expected_ratio):
    page = docs("sji").pages[page_no - 1]
    _, _, ratio = detect_duplicate_text(page)
    assert ratio == pytest.approx(expected_ratio, abs=1e-5)
    assert check_page(page)["status"] == DUPLICATE_TEXT


def test_plant_gages_duplicate_ratio(docs):
    """PLANT GAGES' bulleted section: 7.7291%, 1462 chars, 113 flagged."""
    n, flagged, ratio = detect_duplicate_text(docs("plant").pages[1])
    assert (n, flagged) == (1462, 113)
    assert ratio == pytest.approx(0.077291, abs=1e-6)
    assert check_page(docs("plant").pages[1])["status"] == DUPLICATE_TEXT


# Amendment 10 fixtures for detect_interleaved_lines, the detection primitive.
# NOT wired into check_page yet -- see the note above INTERLEAVE_PAGE_MIN_LINES
# and the one in check_page itself. It is verified correct against real,
# table-region-free prose (this whole block); it is NOT yet safe against
# content that includes table regions (see test_sji_interleaved_check_false_
# positives_on_table_rows below, which is exactly why it isn't wired).
def test_hilti_kb2_p0_flags_interleaved_text(docs):
    """GLM's original evidenced case. Measured: 12 of 111 lines flagged."""
    page = docs("hilti_kb2").pages[0]
    n_lines, flagged = detect_interleaved_lines(page)
    assert n_lines == 111
    assert len(flagged) == 12


def test_hilti_kb2_p1_flags_interleaved_text(docs):
    """Verified independently during review, not asserted from p0 alone.
    Measured: 9 of 118 lines flagged, including the two lines confirmed by
    hand (top=41: 'ER-4627). A length identification code letter is stamped
    on' | 'member, and anchors subjected to seismic loads,'; top=51 similarly)."""
    page = docs("hilti_kb2").pages[1]
    n_lines, flagged = detect_interleaved_lines(page)
    assert n_lines == 118
    assert len(flagged) == 9
    tops = {f["top"] for f in flagged}
    assert {41, 51}.issubset(tops)


def test_hilti_kb2_p5_also_genuinely_interleaved(docs):
    """Not previously reported by the original dry-run (which only checked
    unmapped-glyph/duplicate-text, not interleaving) or by this review's
    initial pass (which assumed p5 was a clean negative control without
    checking by hand first -- it was not). Confirmed a real third instance,
    not a false positive: p5 has 0 table regions (so this cannot be the
    table-column confound below), and the flagged text is the same
    letterhead-vs-body-text pattern as p0/p1 ('KWIK BOLT-II AND POST NUT KWIK
    BOLT-II' glued to '4.6 Except where specifically noted in the tables,').
    Measured: 3 flagged lines."""
    page = docs("hilti_kb2").pages[5]
    n_lines, flagged = detect_interleaved_lines(page)
    assert len(flagged) == 3


def test_hilti_kb2_p4_is_genuinely_clean(docs):
    """The one page actually verified clean (not just assumed): 2 lines total
    on the page, neither flagged."""
    page = docs("hilti_kb2").pages[4]
    n_lines, flagged = detect_interleaved_lines(page)
    assert flagged == []


def test_sji_p17_false_positive_without_exclusion_fixed_with_it(docs):
    """The concrete reproduction from the first attempt, now with the fix.
    Unscoped (page-wide), SJI p17 false-positives on a genuine table row
    (JOIST SERIES | MINIMUM FILLET WELD | SUGGESTED INCREASED WELD LENGTH) --
    table columns are SUPPOSED to have wide gaps. Scoped with exclude_bboxes
    from the page's own confirmed §2 regions (accepted AND rejected -- a
    rejected region's characters still flow to proseText per
    tables.process_page, so they must be excluded here too), the same line no
    longer flags."""
    page = docs("sji").pages[16]  # printed page 17
    _, unscoped = detect_interleaved_lines(page)
    assert any("K-Series" in f["text"] for f in unscoped), "reproduction itself broke; re-check by hand"

    result = process_page(page)
    bboxes = [t["bbox"] for t in result["tables"]] + [r["bbox"] for r in result["rejected"]]
    _, scoped = detect_interleaved_lines(page, exclude_bboxes=bboxes)
    assert scoped == []


def test_sji_p229_title_line_excluded_by_similarity(docs):
    """The near-duplicate-half-content filter, isolated. p229's repeated-title
    line ('TABLE ERECTION BRIDGING FOR' x2, SequenceMatcher ratio 1.00) is
    excluded. Its second flagged line ('SHORT SPAN JOISTS-[Continued]' vs
    'LONG SPAN JOISTS', ratio 0.58) is deliberately NOT excluded -- 0.58 sits
    too close to a confirmed true positive (p230's 0.61) to filter safely;
    see INTERLEAVE_MAX_HALF_SIMILARITY's own comment. Residual, not fixed."""
    page = docs("sji").pages[228]
    result = process_page(page)
    bboxes = [t["bbox"] for t in result["tables"]] + [r["bbox"] for r in result["rejected"]]
    _, flagged = detect_interleaved_lines(page, exclude_bboxes=bboxes)
    texts = [f["text"] for f in flagged]
    assert not any("TABLE ERECTION BRIDGING FOR TABLE ERECTION BRIDGING FOR" in t for t in texts)
    assert any("SHORT SPAN JOISTS" in t for t in texts)


def test_sji_p193_mostly_excluded_by_similarity(docs):
    """p193's parallel LRFD/ASD worked examples ('e) Check live load
    deflection:' and the matching 'Live load = ...' line, both ratio 1.00)
    are excluded. Measured, not assumed uniform: p193 still has 2 lines
    flagged after the filter (down from 3) -- not every line on this page is
    a clean duplicate; one survives with lower similarity."""
    page = docs("sji").pages[192]
    result = process_page(page)
    bboxes = [t["bbox"] for t in result["tables"]] + [r["bbox"] for r in result["rejected"]]
    _, flagged = detect_interleaved_lines(page, exclude_bboxes=bboxes)
    texts = [f["text"] for f in flagged]
    assert not any("Check live load deflection: e) Check live load deflection:" in t for t in texts)
    assert len(flagged) == 2


def test_sji_p230_true_positives_survive_similarity_filter(docs):
    """The similarity filter must not suppress genuine defects to chase the
    p229/p193 fix -- p230's worst case (0.61) stays well under the 0.85
    cutoff, so all 12 of its confirmed-interleaved lines remain flagged."""
    page = docs("sji").pages[229]
    result = process_page(page)
    bboxes = [t["bbox"] for t in result["tables"]] + [r["bbox"] for r in result["rejected"]]
    _, flagged = detect_interleaved_lines(page, exclude_bboxes=bboxes)
    assert len(flagged) == 12


@pytest.mark.slow
def test_sji_full_document_interleaved_check_residual(docs):
    """Full 240-page regression, not just the calibration set -- exactly what
    was asked for. Region-exclusion plus the similarity filter together: 62/240
    (25.8%, 633 lines) unscoped -> 16/240 pages, **77** lines with both fixes
    active (down from 85 with region-exclusion alone -- the similarity filter
    removed 8 more lines page-wide, not just the 2 pages it was calibrated on;
    verified by full rerun, not assumed from the p229/p193 samples alone).
    The residual 16 pages are not one failure mode -- sampled by hand, at
    least three different things, none of them the original table-column-gap
    confound this fix targeted:
      - genuine false positives: one long, coherent sentence with an unusually
        wide internal gap (a footnote reference, list-item indentation) that
        isn't two glued streams at all (pages 49, 53, 56, 61, 113) -- and not
        caught by the similarity filter either, since the two sides of these
        lines are NOT similar to each other, just genuinely one sentence.
      - real two-column content with no §2-detected gridlines to exclude by,
        now partially addressed by the similarity filter (p229's title line,
        p193's two duplicate lines) but not fully -- p229's second line
        (0.58 similarity) and p193's third line survive, deliberately, since
        neither clears the conservative 0.85 cutoff.
      - at least one page (230) confirmed as a genuine second true positive on
        a document this check was never calibrated against -- see spec
        Amendment 10 for the cross-document validation note.
    Not further tuned here -- forcing this to zero risks suppressing p230-class
    genuine positives to chase a number, the same mistake the original
    page-wide version made in the other direction. Flagged for review."""
    pages = docs("sji").pages
    flagged_pages = []
    total_lines = 0
    for page in pages:
        result = process_page(page)
        bboxes = [t["bbox"] for t in result["tables"]] + [r["bbox"] for r in result["rejected"]]
        _, flagged = detect_interleaved_lines(page, exclude_bboxes=bboxes)
        if flagged:
            flagged_pages.append(page.page_number)
            total_lines += len(flagged)
    assert len(flagged_pages) == 16, f"residual count changed: {flagged_pages}"
    assert total_lines == 77


def test_clean_page_scores_zero_overlap(docs):
    """Spec §1: every clean page tested scored exactly 0.00%, which is what gives
    the 3% threshold its margin."""
    _, _, ratio = detect_duplicate_text(docs("hilti").pages[5])
    assert ratio == 0.0


@pytest.mark.slow
def test_sji_full_document_validity(docs):
    """240 pages, all three §1 checks composed: 227 pass, 13 fail.

    The 13 are the union of the two sub-checks with no overlap -- the 7
    empty/unmapped pages (1,5,21,22,25,239,240) plus the 6 letter-doubled pages
    (10,26,115,192,193,194). The benchmark's "233 pass / 7 fail" figure came
    from the glyph checks ALONE, before duplicate-text was folded in; spec §1
    requires all three to run on every page.
    """
    pages = docs("sji").pages
    assert len(pages) == 240
    results = [check_page(p) for p in pages]
    failed = {i + 1: r["status"] for i, r in enumerate(results) if r["status"] != VALID}
    assert sorted(failed) == sorted(SJI_FAIL_PAGES + list(SJI_DUPLICATE_PAGES))
    assert [p for p, s in failed.items() if s == DUPLICATE_TEXT] == list(SJI_DUPLICATE_PAGES)
    for page_no, status in SJI_EXPECT.items():
        assert failed[page_no] == status
    assert sum(1 for r in results if r["status"] == VALID) == 227


@pytest.mark.slow
def test_connection_details_all_pages_empty(docs):
    """completeconnectiondetails-2.pdf: 0 characters across all 84 pages."""
    pages = docs("ccd").pages
    assert len(pages) == 84
    statuses = [check_page(p)["status"] for p in pages]
    assert statuses == [EMPTY] * 84
