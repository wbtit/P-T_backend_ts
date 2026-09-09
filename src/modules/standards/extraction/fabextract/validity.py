"""Spec §1 -- per-page text validity. Runs first, on every page, unconditionally.

Carried over from the Stage 1-5 benchmark modules page_validity.py and
dup_text_check.py without behavioural change. Thresholds and the band-based
duplicate scan are as calibrated there; see spec §1 for why each number is what
it is. Verified against the pinned fixture values in tests/test_validity.py.
"""
import re
from collections import defaultdict

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

# Manifest-facing validity statuses (spec §1).
VALID = "VALID"
EMPTY = "EMPTY"
UNMAPPED_GLYPH = "UNMAPPED_GLYPH"
DUPLICATE_TEXT = "DUPLICATE_TEXT"


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


def check_page(page,
               unmapped_threshold=UNMAPPED_DOMINANCE_THRESHOLD,
               duplicate_threshold=PAGE_DOMINANCE_THRESHOLD):
    """Spec §1, all three checks in order. Returns the manifest's `validity` block:

        {status, reason, unmappedRatio, overlapRatio, nChars, nUnmapped, nOverlapping}

    status is VALID or one of EMPTY / UNMAPPED_GLYPH / DUPLICATE_TEXT. A page whose
    status is not VALID is untrustworthy: skip table extraction entirely (spec §5).
    """
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
