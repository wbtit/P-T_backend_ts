"""Spec §1 fixtures. Every expected value here was measured on a real run and
is recorded in the Phase 2 amendments; none are invented.

The full-document scans are marked `slow` -- they take minutes. The fast subset
runs after every change.
"""
import pytest

from fabextract.validity import (DUPLICATE_TEXT, EMPTY, UNMAPPED_GLYPH, VALID,
                                 check_page, detect_duplicate_text)

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
