"""Spec §1 -- per-page text validity. Runs first, on every page, unconditionally.

Carried over from the Stage 1-5 benchmark modules page_validity.py and
dup_text_check.py without behavioural change. Thresholds and the band-based
duplicate scan are as calibrated there; see spec §1 for why each number is what
it is. Verified against the pinned fixture values in tests/test_validity.py.
"""
import re
from collections import defaultdict
from difflib import SequenceMatcher

CID_PATTERN = re.compile(r'\(cid:\d+\)')

# Spec §1: "dominated by", not "contains any" -- a handful of corrupted symbols
# shouldn't sink an otherwise-good page.
UNMAPPED_DOMINANCE_THRESHOLD = 0.15

# A character counts as "duplicated" if its bounding box is substantially overlapped
# (>= MIN_OVERLAP_FRAC of its own area) by another character's bounding box that is
# not itself (normal kerning/italic-slant overlap between adjacent same-line chars
# is typically well under 20% of a glyph's area; two independent text layers stacked
# in the same region -- as found in PLANT STANDARD GAGES -- show near-total overlap,
# since one glyph's box sits almost entirely inside the other's).
MIN_OVERLAP_FRAC = 0.5

# Page-level dominance threshold: fraction of the page's non-whitespace characters
# that must be flagged as duplicated before the page itself is considered untrustworthy.
# Every clean page tested scored exactly 0.00%, so 3% has wide margin either side.
PAGE_DOMINANCE_THRESHOLD = 0.03

# Spec Amendment 10 -- a naive Y-position sort glues two spatially separate
# columns onto one rendered line when both happen to have content at the same
# Y-band; the result reads as real words in the wrong order (no bbox overlap,
# no unmapped glyphs, so §1's other two checks have nothing to trigger on).
# Calibrated on Hilti_KB_2_ER_4627 p1's two confirmed-interleaved lines (65.8pt
# gap, 9/7 and 11/5 word split either side) against 4 independent clean pages
# checked directly (Hilti_KB_2_ER_4627 p4/p5, Expansion_Anchor p6, AISC p896):
# every clean page's worst-case gap had <3 words on at least one side (a short
# trailing fragment -- a page footer, a lone page number -- not two real
# column halves), while both known-interleaved lines had >=3 words on both
# sides. The word-count-on-both-sides condition is load-bearing: gap size
# alone is not a clean signal -- clean pages showed max gaps up to 275pt from
# ordinary short trailing lines, well above the 65.8pt corrupted case.
INTERLEAVE_GAP_MIN_PT = 30.0
INTERLEAVE_MIN_WORDS_PER_SIDE = 3

# Amendment 10 follow-up -- the region-exclusion fix (see exclude_bboxes on
# detect_interleaved_lines) does not catch two-column content with no §2
# region to exclude by, because it never passed the vector-line grid gate:
# dot-leader index/TOC tables and side-by-side duplicate worked examples.
# Investigated and rejected: leader-character detection (the originally
# proposed fix) does not apply -- on SJI p229's flagged line, the flagged gap
# sits between "NM" and "18LH02" (the real column gutter), not adjacent to
# the dot-leader run at all; the dots merge into their own word token and
# never touch the flagged gap boundary. What both p229 and p193 (parallel
# LRFD/ASD worked examples, "e) Check live load deflection:" appearing
# verbatim on both sides) actually share is that the line's two halves are
# near-identical text, not unrelated content -- exactly the opposite
# character of Hilti's genuine defect (letterhead vs. body text, or two
# different numbered clauses, always low similarity).
#
# Measured, not assumed: SequenceMatcher ratio on the two halves is 1.00 for
# p193's lines and p229's title-repeat line ("TABLE ERECTION BRIDGING FOR"
# x2), vs. a MAXIMUM of 0.61 across every confirmed true positive checked
# (12 Hilti p0 lines, both p1 lines, all 3 p5 lines, all 12 p230 lines) --
# p230's own worst case, "(iv) When two pieces of bridging are" / "(iv) At
# least one row of bridging is", scores 0.61, uncomfortably close to p229's
# WEAKER second line (0.58, "SHORT SPAN JOISTS" vs "LONG SPAN JOISTS") -- a
# looser threshold anywhere in 0.5-0.6 would either miss p229's second line
# or wrongly exclude a genuine p230 defect. 0.85 sits with real margin above
# every true positive and only catches the near-exact-duplicate cases this
# was meant for -- deliberately conservative: p229's second line stays
# flagged (residual, not fixed by this), not chased into the collision zone.
INTERLEAVE_MAX_HALF_SIMILARITY = 0.85

# Page-level dominance: n=2 confirmed-interleaved lines on the one page tested,
# n=0 false positives across 4 clean pages checked. Set to require >=2 flagged
# lines, not >=1, as extra margin beyond what was directly calibrated -- a
# single-line trigger has not been stress-tested against a large corpus and a
# false positive here sends a real page to visual-only. Revisit with more data
# once this runs against more of the corpus, same as the CRAG AMBIGUOUS
# threshold's provisional status.
INTERLEAVE_PAGE_MIN_LINES = 2

# Manifest-facing validity statuses (spec §1).
VALID = "VALID"
EMPTY = "EMPTY"
UNMAPPED_GLYPH = "UNMAPPED_GLYPH"
DUPLICATE_TEXT = "DUPLICATE_TEXT"
INTERLEAVED_TEXT = "INTERLEAVED_TEXT"


def is_unmapped_char(ch_text):
    """A char's extracted text is 'unmapped' if it's a literal (cid:N) placeholder,
    or falls in the Unicode Private Use Area (common fallback for missing ToUnicode
    maps), or is a non-printable control character."""
    if not ch_text:
        return True
    if CID_PATTERN.search(ch_text):
        return True
    for c in ch_text:
        cp = ord(c)
        if 0xE000 <= cp <= 0xF8FF:  # Private Use Area
            return True
        if cp < 0x20 and c not in ('\n', '\t'):  # control chars
            return True
    return False


def _bbox_overlap_frac(a, b):
    ox = max(0, min(a["x1"], b["x1"]) - max(a["x0"], b["x0"]))
    oy = max(0, min(a["bottom"], b["bottom"]) - max(a["top"], b["top"]))
    overlap = ox * oy
    area_a = (a["x1"] - a["x0"]) * (a["bottom"] - a["top"])
    return overlap / area_a if area_a > 0 else 0


def detect_duplicate_text(page, min_overlap_frac=MIN_OVERLAP_FRAC):
    """Returns (n_chars, n_flagged, ratio). Flags characters whose bbox is
    substantially overlapped by another (different) character's bbox."""
    chars = [c for c in page.chars if c.get("text", "").strip()]
    n = len(chars)
    if n == 0:
        return 0, 0, 0.0
    band = defaultdict(list)
    for c in chars:
        band[round(c["top"])].append(c)
    flagged = 0
    for c in chars:
        found = False
        for dt in (-1, 0, 1):
            for other in band.get(round(c["top"]) + dt, []):
                if other is c:
                    continue
                if abs(other["x0"] - c["x0"]) > 30:
                    continue
                if _bbox_overlap_frac(c, other) >= min_overlap_frac:
                    found = True
                    break
            if found:
                break
        if found:
            flagged += 1
    return n, flagged, flagged / n


def _word_center_in_bbox(word, bbox):
    x0, top, x1, bottom = bbox
    cx = (word["x0"] + word["x1"]) / 2
    cy = (word["top"] + word["bottom"]) / 2
    return x0 <= cx <= x1 and top <= cy <= bottom


def detect_interleaved_lines(page, gap_min=INTERLEAVE_GAP_MIN_PT,
                              min_words_per_side=INTERLEAVE_MIN_WORDS_PER_SIDE,
                              exclude_bboxes=None,
                              max_half_similarity=INTERLEAVE_MAX_HALF_SIMILARITY):
    """Returns (n_lines_checked, flagged_lines) where flagged_lines is a list of
    {top, gap, leftWords, rightWords, text} for each rendered line whose single
    largest intra-line word gap exceeds gap_min AND leaves at least
    min_words_per_side words on both sides of that gap -- see Amendment 10 for
    why both conditions are required, not just the gap.

    exclude_bboxes (Amendment 10 follow-up): words whose center falls inside
    any of these boxes are dropped before line-grouping. A genuine table
    column's gap looks identical to two glued prose columns under this
    rule -- passing every confirmed §2 candidate region here (accepted AND
    rejected; a rejected region's characters still flow to proseText per
    tables.process_page, so they must be excluded here too, not just the
    accepted ones) is what makes this check safe to run at all. Without this
    argument the check is page-wide and known to false-positive on real
    tables -- see the SJI regression this was calibrated against.

    max_half_similarity (second Amendment 10 follow-up): a line that would
    otherwise flag is dropped if its two halves (split at the flagged gap)
    are near-identical text (SequenceMatcher ratio >= this value) -- dot-leader
    index tables and parallel duplicate worked examples read as two coherent,
    near-identical halves, the opposite signature of genuinely glued unrelated
    content. Deliberately conservative (0.85 default, real margin above every
    confirmed true positive's max of 0.61) -- see the threshold's own comment
    for why a looser value isn't safe."""
    words = page.extract_words()
    if exclude_bboxes:
        words = [w for w in words if not any(_word_center_in_bbox(w, bb) for bb in exclude_bboxes)]
    lines = defaultdict(list)
    for w in words:
        lines[round(w["top"])].append(w)

    flagged = []
    for top, ws in lines.items():
        if len(ws) < 2 * min_words_per_side:
            continue
        ws = sorted(ws, key=lambda w: w["x0"])
        gaps = [(ws[i + 1]["x0"] - ws[i]["x1"], i) for i in range(len(ws) - 1)]
        gap, split_idx = max(gaps)
        left_n = split_idx + 1
        right_n = len(ws) - left_n
        if gap >= gap_min and left_n >= min_words_per_side and right_n >= min_words_per_side:
            left_text = " ".join(w["text"] for w in ws[:left_n])
            right_text = " ".join(w["text"] for w in ws[left_n:])
            similarity = SequenceMatcher(None, left_text, right_text).ratio()
            if similarity >= max_half_similarity:
                continue
            # Amendment 11: the line's own bbox, from its constituent words --
            # NOT inferred from exclude_bboxes having already removed
            # in-table words. That removal guarantees no *word* of this line
            # sits inside a table, but a line's Y-band could still overlap a
            # table's vertical span via a same-height, different-X caption
            # (e.g. sitting beside a table, not inside it) -- so the mixed-
            # status eligibility check in manifest.py needs its own real 2D
            # geometry, not an assumption piggybacked on the exclusion step.
            bottom = max(w["bottom"] for w in ws)
            flagged.append({"top": top, "bottom": bottom,
                             "x0": ws[0]["x0"], "x1": ws[-1]["x1"],
                             "gap": gap, "leftWords": left_n, "rightWords": right_n,
                             "halfSimilarity": similarity, "text": " ".join(w["text"] for w in ws)})
    return len(lines), flagged


def check_page(page,
               unmapped_threshold=UNMAPPED_DOMINANCE_THRESHOLD,
               duplicate_threshold=PAGE_DOMINANCE_THRESHOLD):
    """Spec §1, the three original checks, in order. Returns the manifest's
    `validity` block:

        {status, reason, unmappedRatio, overlapRatio, nChars, nUnmapped, nOverlapping}

    status is VALID or one of EMPTY / UNMAPPED_GLYPH / DUPLICATE_TEXT. A page
    whose status is not VALID is untrustworthy: skip table extraction
    entirely (spec §5).

    INTERLEAVED_TEXT is NOT decided here, on purpose. Amendment 10's
    interleaving check needs confirmed §2 table regions to score against
    (see detect_interleaved_lines' exclude_bboxes) and so cannot run before
    §2 exists -- unlike the three checks above, which are genuinely page-wide
    and need nothing from §2. manifest.build_page_manifest runs it as a
    fourth, later step, after §2-4, using this function's VALID result as the
    gate for whether to bother (an already-untrustworthy page skips it, same
    as it already skips table extraction)."""
    chars = page.chars
    n_chars = len(chars)

    if n_chars == 0:
        text = page.extract_text() or ""
        if len(text.strip()) == 0:
            return {"status": EMPTY, "reason": "zero extracted characters",
                    "unmappedRatio": 0.0, "overlapRatio": 0.0,
                    "nChars": 0, "nUnmapped": 0, "nOverlapping": 0}
        # Text but no chars is a rare edge case; not a §1 failure mode.
        return {"status": VALID, "reason": "text_without_chars",
                "unmappedRatio": 0.0, "overlapRatio": 0.0,
                "nChars": 0, "nUnmapped": 0, "nOverlapping": 0}

    n_unmapped = sum(1 for c in chars if is_unmapped_char(c.get("text", "")))
    unmapped_ratio = n_unmapped / n_chars

    if unmapped_ratio >= unmapped_threshold:
        return {"status": UNMAPPED_GLYPH,
                "reason": f"dominated by unmapped glyphs (ratio={unmapped_ratio:.2%})",
                "unmappedRatio": unmapped_ratio, "overlapRatio": 0.0,
                "nChars": n_chars, "nUnmapped": n_unmapped, "nOverlapping": 0}

    n_dup_chars, n_flagged, overlap_ratio = detect_duplicate_text(page)
    if overlap_ratio >= duplicate_threshold:
        return {"status": DUPLICATE_TEXT,
                "reason": f"duplicate/overlapping text (ratio={overlap_ratio:.2%})",
                "unmappedRatio": unmapped_ratio, "overlapRatio": overlap_ratio,
                "nChars": n_chars, "nUnmapped": n_unmapped, "nOverlapping": n_flagged}

    return {"status": VALID, "reason": "ok",
            "unmappedRatio": unmapped_ratio, "overlapRatio": overlap_ratio,
            "nChars": n_chars, "nUnmapped": n_unmapped, "nOverlapping": n_flagged}
