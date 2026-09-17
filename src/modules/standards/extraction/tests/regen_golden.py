"""Regenerate golden grid files for test_tables.py.

Deliberate, manual step -- never run automatically. Golden files are a
regression net, not ground truth: the ground truth lives in the explicit
assertions in test_tables.py. Only regenerate after those still pass, and
review the diff.

    python tests/regen_golden.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pdfplumber  # noqa: E402

from conftest import DOCS, EXPECTED_DIR  # noqa: E402
from fabextract.tables import process_page  # noqa: E402

TARGETS = [
    ("aisc_1638", "aisc", 1637), ("aisc_1414", "aisc", 1413),
    ("canam_p84", "canam", 83), ("hilti_p6", "hilti", 5),
    ("newmill_180", "newmill", 180), ("newmill_220", "newmill", 220),
    ("aisc_1100", "aisc", 1099), ("aisc_1444", "aisc", 1443),
]


def main():
    EXPECTED_DIR.mkdir(parents=True, exist_ok=True)
    opened = {}
    for name, doc, idx in TARGETS:
        if doc not in opened:
            opened[doc] = pdfplumber.open(str(DOCS[doc]))
        result = process_page(opened[doc].pages[idx])
        payload = {
            "status": result["status"],
            "nTables": len(result["tables"]),
            "cells": [t["cells"] for t in result["tables"]],
            "rejected": [r["reason"] for r in result["rejected"]],
        }
        out = EXPECTED_DIR / f"{name}.json"
        out.write_text(json.dumps(payload, indent=2))
        print(f"wrote {out}  status={payload['status']} nTables={payload['nTables']} "
              f"rejected={payload['rejected']}")


if __name__ == "__main__":
    main()
