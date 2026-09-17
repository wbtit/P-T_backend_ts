"""Build item 2 -- per-page heading provenance with gates on both sources.

Every number here was measured on the real documents and is recorded in the
Phase 2 amendments.
"""
import pdfplumber
import pypdf
import pytest

from fabextract.outline import (OUTLINE_FILL_MIN_COVERAGE, REGEX_HEADING_RESET_PAGES,
                                REGEX_MIN_DISTINCT_MATCHES, SOURCE_NULL, SOURCE_OUTLINE,
                                SOURCE_REGEX, AISC_HEADING_RE, apply_regex_headings,
                                build_page_headings, detect_headings, outline_coverage,
                                read_outline, regex_headings_for_page)

from conftest import DOCS


@pytest.fixture(scope="module")
def aisc_outline():
    reader = pypdf.PdfReader(str(DOCS["aisc"]))
    entries, unresolved = read_outline(reader)
    return reader, entries, unresolved


@pytest.fixture(scope="module")
def aisc_headings():
    pdf = pdfplumber.open(str(DOCS["aisc"]))
    return detect_headings(DOCS["aisc"], plumber_pages=pdf.pages)


@pytest.fixture(scope="module")
def sji_headings():
    pdf = pdfplumber.open(str(DOCS["sji"]))
    return detect_headings(DOCS["sji"], plumber_pages=pdf.pages)


@pytest.fixture(scope="module")
def hilti_headings():
    pdf = pdfplumber.open(str(DOCS["hilti"]))
    return detect_headings(DOCS["hilti"], plumber_pages=pdf.pages)


# ---------- gate 1: resolve in-document ----------

def test_aisc_resolved_entry_count(aisc_outline):
    """1673 entries in the tree; 1662 resolve. The other 11 return no
    destination WITHOUT raising -- e.g. 'OSHA Requirements'. Only resolved
    entries count."""
    _, entries, unresolved = aisc_outline
    assert len(entries) == 1662
    assert unresolved == 11
    assert max(e["depth"] for e in entries) == 7


def test_43rd_edition_outline_does_not_zero_out():
    """The resolve-in-document rule alone does NOT zero this catalog out: 2 of
    its 5 errata entries resolve (p234, p235). That is why the coverage gate
    exists."""
    reader = pypdf.PdfReader(str(DOCS["sji"]))
    entries, unresolved = read_outline(reader)
    assert len(entries) == 2
    assert unresolved == 3
    assert {e["page"] for e in entries} == {233, 234}


# ---------- gate 2: outline forward-fill coverage ----------

def test_outline_coverage_is_distinct_start_pages(aisc_outline):
    """Gate input is DISTINCT START PAGES / page count -- how much of the
    document the outline actually points at. Entry count is the rejected
    reading: it is unbounded above 1.0 on a dense outline, so it conflates
    'describes the document' with 'has many entries'. On AISC the two readings
    differ materially: 821/2325 = 0.353 versus 1662/2325 = 0.715."""
    reader, entries, _ = aisc_outline
    coverage, distinct, entry_ratio = outline_coverage(entries, len(reader.pages))
    assert distinct == 821
    assert coverage == pytest.approx(0.3531, abs=1e-4)
    assert entry_ratio == pytest.approx(0.7148, abs=1e-4)
    assert coverage >= OUTLINE_FILL_MIN_COVERAGE


def test_entry_count_ratio_can_exceed_one():
    """Why entry count was rejected: several entries may share a start page."""
    entries = [{"depth": 1, "title": f"E{i}", "page": 0, "isLeaf": True, "ancestors": []}
               for i in range(5)]
    coverage, distinct, entry_ratio = outline_coverage(entries, 2)
    assert distinct == 1
    assert coverage == 0.5
    assert entry_ratio == 2.5  # unbounded -- not a coverage measure


def test_aisc_fill_applied_and_runs_unchanged(aisc_headings):
    """Acceptance: AISC heading output unchanged, including the long runs.
    Coverage 0.353 clears the 0.10 threshold comfortably."""
    headings, meta = aisc_headings
    assert meta["outlineFillApplied"] is True
    assert meta["outlineCoverageRatio"] == pytest.approx(0.3531, abs=1e-4)
    assert meta["maxRunLength"] == 90
    assert sorted({h["runLength"] for h in headings if h["runLength"]}, reverse=True)[:3] == [90, 48, 45]
    longest = [h for h in headings if h["runLength"] == 90]
    assert len(longest) == 90
    assert all("Table 6-1" in h["heading"] for h in longest)


def test_aisc_front_matter_is_null(aisc_headings):
    """The 11 uncovered pages are front matter before the first entry. They stay
    null -- the regex must not be allowed to invent headings for them."""
    headings, _ = aisc_headings
    assert [i for i, h in enumerate(headings) if h["heading"] is None] == list(range(11))
    assert all(h["headingSource"] == SOURCE_NULL for h in headings[:11])
    assert headings[11]["heading"] == "Part 1"
    assert headings[11]["headingSource"] == SOURCE_OUTLINE


def test_sji_fill_disabled_no_wrong_heading_on_real_content(sji_headings):
    """Acceptance: with fill off, the 2 errata pages keep their own headings and
    p236-240's load tables get null instead of 'Eratta One'. 2 distinct start
    pages in a 240-page catalog = 0.0083, far under the 0.10 threshold."""
    headings, meta = sji_headings
    assert meta["outlineFillApplied"] is False
    assert meta["outlineCoverageRatio"] == pytest.approx(0.0083, abs=1e-4)
    assert meta["outlineCoverageRatio"] < OUTLINE_FILL_MIN_COVERAGE
    assert headings[233]["heading"] == "Errata 1 and 2 Final 4-12-2012.pdf"
    assert headings[234]["heading"] == "Eratta One"
    # The load-table pages that previously wore an errata heading.
    assert all(h["heading"] is None for h in headings[235:240])
    # The entire catalog body.
    assert all(h["heading"] is None for h in headings[:233])
    assert sum(1 for h in headings if h["heading"] is None) == 238


def test_build_page_headings_respects_forward_fill_flag():
    entries = [{"depth": 1, "title": "A", "page": 2, "isLeaf": True, "ancestors": []}]
    filled = build_page_headings(entries, 6, forward_fill=True)
    assert [h["heading"] for h in filled] == [None, None, "A", "A", "A", "A"]
    unfilled = build_page_headings(entries, 6, forward_fill=False)
    assert [h["heading"] for h in unfilled] == [None, None, "A", None, None, None]


# ---------- gate 3: regex line-initial + distinct-match count ----------

def test_regex_rejects_mid_line_fragment():
    """Line-initial matching: a heading pattern buried mid-line is not a heading."""
    assert AISC_HEADING_RE.match("body text 4.A Real Heading") is None


def test_expansion_anchor_false_positive_is_rejected_in_situ():
    """The precise mechanism, measured -- worth pinning because it is not the
    one it looks like.

    The old code matched against `page.extract_text()`, which returns this line
    space-stripped as '4.Theanchorbearsalength Installation'. That string DOES
    match the pattern ('4.T' is digit-dot-uppercase), which is how one fragment
    of body text became the heading for 13 of 15 pages.

    Matching against Y-clustered lines instead restores the word-gap spacing
    (spec §4), giving '4. The anchor bears a length Installation' -- and '4. T'
    is not digit-dot-uppercase, so it no longer matches. The isolated
    space-stripped string still matches the pattern; what fixes this is the
    input, not the regex.
    """
    import pdfplumber
    from fabextract.tables import segment_chars
    page = pdfplumber.open(str(DOCS["hilti"])).pages[2]
    text, _ = segment_chars(page.chars)
    lines = [l for l in text.split("\n") if "anchor bears" in l]
    assert lines == ["4. The anchor bears a length Installation"]
    assert AISC_HEADING_RE.match(lines[0].strip()) is None
    # The old, space-stripped form is what used to match.
    assert AISC_HEADING_RE.match("4.Theanchorbearsalength Installation") is not None


def test_regex_accepts_line_initial_heading():
    m = AISC_HEADING_RE.match("2.B Design Basis")
    assert m and m.group(1) == "2.B Design Basis"


def test_regex_discarded_wholesale_below_distinct_threshold():
    """One match is noise. Failing the gate discards EVERY regex heading in the
    document -- never a partial keep."""
    matches = [None, "3.A Something", None, None]
    headings, n_distinct, trusted = apply_regex_headings(matches, 4)
    assert n_distinct == 1
    assert trusted is False
    assert all(h["heading"] is None for h in headings)
    assert all(h["headingSource"] == SOURCE_NULL for h in headings)


def test_regex_trusted_at_threshold():
    matches = ["1.A One", None, "2.B Two", None, "3.C Three"]
    headings, n_distinct, trusted = apply_regex_headings(matches, 5)
    assert n_distinct == REGEX_MIN_DISTINCT_MATCHES
    assert trusted is True
    assert [h["heading"] for h in headings] == ["1.A One", "1.A One", "2.B Two", "2.B Two", "3.C Three"]
    assert headings[0]["headingSource"] == SOURCE_REGEX


def test_regex_fallback_still_resets():
    """The 36-page reset stays on the regex path, where detection fails OPEN."""
    carried, since = "3.A Something", 0
    for _ in range(REGEX_HEADING_RESET_PAGES - 1):
        carried, since = regex_headings_for_page("no heading here", carried, since)
    assert carried == "3.A Something"
    carried, since = regex_headings_for_page("still nothing", carried, since)
    assert carried is None


# ---------- noHeadingsDetected + coverage ratio ----------

def test_expansion_anchor_all_null(hilti_headings):
    """Acceptance: the regex false positive is gone, all 15 pages null,
    noHeadingsDetected true, coverage 0.0."""
    headings, meta = hilti_headings
    assert all(h["heading"] is None for h in headings)
    assert all(h["headingSource"] == SOURCE_NULL for h in headings)
    assert meta["noHeadingsDetected"] is True
    assert meta["headingCoverageRatio"] == 0.0
    assert meta["regexTrusted"] is False


def test_heading_coverage_ratio_reported(aisc_headings, sji_headings):
    """The signal for spotting the next bad case -- a ratio, not a boolean a
    single match can flip."""
    _, aisc_meta = aisc_headings
    _, sji_meta = sji_headings
    assert aisc_meta["headingCoverageRatio"] == pytest.approx(0.9953, abs=1e-4)
    assert sji_meta["headingCoverageRatio"] == pytest.approx(0.0083, abs=1e-4)
    # SJI has 2 real outline headings, so noHeadingsDetected is False even
    # though coverage is near zero -- which is exactly why the ratio matters.
    assert sji_meta["noHeadingsDetected"] is False


def test_no_document_level_source(aisc_headings):
    """Source is per page. AISC carries both OUTLINE and NULL pages."""
    headings, _ = aisc_headings
    sources = {h["headingSource"] for h in headings}
    assert sources == {SOURCE_OUTLINE, SOURCE_NULL}
