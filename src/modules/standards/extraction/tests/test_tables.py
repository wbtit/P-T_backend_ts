"""Spec §2-4 fixtures plus the Phase 2 amendments.

Two layers, deliberately:
  1. Explicit ground-truth assertions -- values verified against the real
     documents (cell contents, merge behaviour, region counts). These are not
     self-referential and catch a regression even if the golden files are
     regenerated.
  2. Golden-file comparison -- full grid equality against expected/*.json, so
     any cell-level drift anywhere in a table is caught, not just spot values.

Regenerate golden files ONLY with a deliberate `--regen-golden` run, and only
after the layer-1 assertions still pass.
"""
import json

import pytest

from fabextract.tables import (EXTRACTED, FALLBACK_SHOW_IMAGE, detect_table_regions,
                               process_page)

from conftest import EXPECTED_DIR

# 17 hard AISC pages: every one must land on EXTRACTED or FALLBACK_SHOW_IMAGE.
# There is no third state and no partial extraction (spec §5).
AISC_HARD_PAGES = [23, 25, 60, 84, 129, 187, 544, 545, 740, 974, 1045, 1046,
                   1100, 1265, 1266, 1444, 1454]


def _golden(name):
    path = EXPECTED_DIR / f"{name}.json"
    if not path.exists():
        pytest.skip(f"golden file not generated: {path}")
    return json.loads(path.read_text())


def _cells(result):
    return [t["cells"] for t in result["tables"]]


# ---------- ground truth: AISC 1638 (the baseline page) ----------

def test_aisc_1638_has_exactly_two_tables(aisc_page):
    """J3.3 and J3.3M. An early version kept only the max-row candidate and
    silently dropped J3.3 -- that is what this pins."""
    result = process_page(aisc_page(1638))
    assert result["status"] == EXTRACTED
    assert len(result["tables"]) == 2


def test_aisc_1638_table_titles(aisc_page):
    result = process_page(aisc_page(1638))
    flat = [" ".join(c for row in t["cells"] for c in row) for t in result["tables"]]
    assert any("TABLE J3.3" in f for f in flat)
    assert any("J3.3M" in f for f in flat)


def test_aisc_1638_fraction_cells_merge_on_one_line(aisc_page):
    """Spec §4: a real font-size transition merges "1" + "5/16" into one value.
    A merged fraction must never be split across newlines."""
    result = process_page(aisc_page(1638))
    all_cells = [c for t in result["tables"] for row in t["cells"] for c in row]
    fractions = [c for c in all_cells if "/" in c]
    assert fractions, "expected fraction cells on page 1638"
    for cell in fractions:
        for line in cell.split("\n"):
            # A fraction must sit wholly on its own line, never split mid-value.
            assert not line.strip().endswith("/"), f"fraction split across lines: {cell!r}"


def test_aisc_1414_extracted(aisc_page):
    result = process_page(aisc_page(1414))
    assert result["status"] == EXTRACTED
    flat = " ".join(c for t in result["tables"] for row in t["cells"] for c in row)
    assert "Table 14-1" in flat or "14-2" in flat


# ---------- ground truth: the never-merge and never-split cases ----------

def test_canam_stacked_numbers_never_merge(docs):
    """canam p84: "298" over "171" is a genuinely two-line cell at the SAME font
    size. Merging them produced "219781" -- character interleaving corruption.
    Same-size stacked content must never merge on proximity alone."""
    result = process_page(docs("canam").pages[83])
    assert result["status"] == EXTRACTED
    all_cells = [c for t in result["tables"] for row in t["cells"] for c in row]
    assert any("298\n171" in c for c in all_cells)
    assert not any("219781" in c for c in all_cells)


def test_expansion_anchor_multiline_label_intact(docs):
    """Hilti p6: "DESIGN\\nINFORMATION" is one multi-line label cell. Running
    refinement on this table (which does NOT need it) split it into spurious
    rows; the row-height guard is what prevents that."""
    result = process_page(docs("hilti").pages[5])
    assert result["status"] == EXTRACTED
    assert len(result["tables"]) == 1
    table = result["tables"][0]
    assert "DESIGN \nINFORMATION" in table["cells"][0][0]
    assert table["nRows"] == 29


def test_expansion_anchor_refinement_does_not_fire(docs):
    """Measured ratio ~1.96-2.0x, below the 2.5x guard."""
    result = process_page(docs("hilti").pages[5])
    table = result["tables"][0]
    assert table["refinementApplied"] is False
    assert table["rowHeightRatio"] < 2.5


def test_aisc_refinement_does_fire(aisc_page):
    """AISC's pattern: rules columns only, leaving rows whitespace-separated.
    Measured ratio ~4.4-4.6x, above the guard."""
    result = process_page(aisc_page(1638))
    assert any(t["refinementApplied"] for t in result["tables"])


# ---------- ground truth: the fallback path ----------

def test_plant_gages_defers_cleanly(docs):
    """The decorative logo's vector lines must not become a table. No partial
    extraction, no degraded attempt -- a clean deferral."""
    result = process_page(docs("plant").pages[1])
    assert result["status"] == FALLBACK_SHOW_IMAGE
    assert result["tables"] == []


def test_plant_gages_needs_no_length_filter(docs):
    """Amendment 1: PLANT GAGES defers on the >=2x2 gate alone. The length
    filter is not load-bearing here -- it closes nothing."""
    off = process_page(docs("plant").pages[1], min_edge_length=None)
    on = process_page(docs("plant").pages[1], min_edge_length=8)
    assert off["status"] == on["status"] == FALLBACK_SHOW_IMAGE


@pytest.mark.parametrize("page_no", AISC_HARD_PAGES)
def test_aisc_hard_pages_have_no_third_state(aisc_page, page_no):
    result = process_page(aisc_page(page_no))
    assert result["status"] in (EXTRACTED, FALLBACK_SHOW_IMAGE)
    if result["status"] == EXTRACTED:
        # Never an EXTRACTED page with zero tables.
        assert result["tables"]
        for t in result["tables"]:
            assert t["status"] == EXTRACTED


# ---------- amendment 2: empty-region rejection ----------

def test_aisc_1444_drops_four_empty_regions(aisc_page):
    """5 candidates pass the >=2x2 gate; 4 hold no text at all."""
    page = aisc_page(1444)
    assert len(detect_table_regions(page)) == 5
    result = process_page(page)
    assert len(result["tables"]) == 1
    assert len(result["rejected"]) == 4
    assert all(r["reason"] == "EMPTY_REGION" for r in result["rejected"])


def test_aisc_1100_keeps_the_real_second_table(aisc_page):
    """4 candidates -> 2 kept. The prediction that 1100 reduces to exactly one
    region was WRONG: alongside the main table there is a genuine, fully
    populated 2x2 LRFD/ASD formula box. Dropping it to hit a predicted count
    would be inventing an answer."""
    page = aisc_page(1100)
    assert len(detect_table_regions(page)) == 4
    result = process_page(page)
    assert len(result["tables"]) == 2
    assert len(result["rejected"]) == 2
    assert all(r["reason"] == "EMPTY_REGION" for r in result["rejected"])
    small = min(result["tables"], key=lambda t: t["nRows"])
    assert small["cells"][0] == ["LRFD", "ASD"]


# ---------- amendment 3: frame rejection ----------

def test_newmill_116_falls_to_visual_only(docs):
    """The page's outer border formed a 3x3 "table" spanning 86.5% of page
    height; character-ordering then ran on the huge cells and produced garbled
    prose under a passing status. Target outcome is a clean deferral."""
    result = process_page(docs("newmill").pages[116])
    assert result["status"] == FALLBACK_SHOW_IMAGE
    assert result["tables"] == []
    assert len(result["rejected"]) == 2
    assert all(r["reason"] == "FRAME_REGION" for r in result["rejected"])


def test_newmill_116_garbled_text_not_asserted_as_cells(docs):
    """The corrupted string must not appear in any extracted cell. It may appear
    in proseText -- that is retrieval-grade text, explicitly not asserted values."""
    result = process_page(docs("newmill").pages[116])
    all_cells = [c for t in result["tables"] for row in t["cells"] for c in row]
    assert not any("gdyerfaintieodn" in c for c in all_cells)


@pytest.mark.parametrize("page_idx", [180, 220])
def test_newmill_regression_guards_still_extract(docs, page_idx):
    """Same document as p116 -- real regression risk from the frame rule."""
    result = process_page(docs("newmill").pages[page_idx])
    assert result["status"] == EXTRACTED
    assert result["rejected"] == []


def test_newmill_180_dividers_survive(docs):
    """The "Recommended Gage Key" row's real per-cell dividers are 8.32-8.89pt.
    Any edge_min_length >=9 merges them into one blob cell -- this is why the
    filter defaults to disabled."""
    result = process_page(docs("newmill").pages[180])
    all_cells = [c for t in result["tables"] for row in t["cells"] for c in row]
    assert any(c.strip() == "22 Gage" for c in all_cells)
    assert not any("Recommended Gage Key: 22 Gage" in c for c in all_cells)


def test_length_filter_at_9_would_regress_newmill_180(docs):
    """Guards the amendment-1 rationale itself: if this ever stops being true,
    the reason the filter is disabled has changed and the spec needs revisiting."""
    result = process_page(docs("newmill").pages[180], min_edge_length=9)
    all_cells = [c for t in result["tables"] for row in t["cells"] for c in row]
    assert any("Recommended Gage Key: 22 Gage" in c for c in all_cells), (
        "p180 no longer regresses at 9pt -- re-evaluate amendment 1")


# ---------- golden files: full grid equality ----------

@pytest.mark.parametrize("name,doc,idx", [
    ("aisc_1638", "aisc", 1637), ("aisc_1414", "aisc", 1413),
    ("canam_p84", "canam", 83), ("hilti_p6", "hilti", 5),
    ("newmill_180", "newmill", 180), ("newmill_220", "newmill", 220),
    ("aisc_1100", "aisc", 1099), ("aisc_1444", "aisc", 1443),
])
def test_golden_grids(docs, name, doc, idx):
    expected = _golden(name)
    result = process_page(docs(doc).pages[idx])
    assert result["status"] == expected["status"]
    assert _cells(result) == expected["cells"]
