import sys
from pathlib import Path

import pdfplumber
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _find_benchmark():
    """Walk up for benchmark-source rather than counting parent hops, so moving
    this package inside the repo does not silently break every fixture."""
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "benchmark-source"
        if candidate.is_dir():
            return candidate
    return Path("benchmark-source")


BENCHMARK = _find_benchmark()

DOCS = {
    "aisc": BENCHMARK / "aisc-14th-edition.pdf",
    "sji": BENCHMARK / "Joist & Hilti/JOIST/43rd_Edition_Catalog_Final_With_Errata1and2.pdf",
    "plant": BENCHMARK / "Joist & Hilti/JOIST/PLANT STANDARD GAGES-NMBS.pdf",
    "canam": BENCHMARK / "Joist & Hilti/JOIST/canam-joist-catalog.pdf",
    "hilti": BENCHMARK / "Joist & Hilti/HILTI/Expansion_Anchor_(316-327)r021.pdf",
    "newmill": BENCHMARK / "Joist & Hilti/JOIST/NewmillCatalog.pdf",
    "ccd": BENCHMARK / "Joist & Hilti/JOIST/completeconnectiondetails-2.pdf",
}

EXPECTED_DIR = Path(__file__).parent / "expected"


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: full-document scans; run on demand")


@pytest.fixture(scope="session")
def docs():
    """Session-scoped open handles -- reopening a 2325-page PDF per test is slow."""
    opened = {}

    def _get(name):
        if name not in opened:
            path = DOCS[name]
            if not path.exists():
                pytest.skip(f"benchmark document missing: {path}")
            opened[name] = pdfplumber.open(str(path))
        return opened[name]

    yield _get
    for pdf in opened.values():
        pdf.close()


@pytest.fixture(scope="session")
def aisc_page(docs):
    """AISC fixture pages are referenced by printed page number: page N is
    pdf.pages[N-1]. Confirmed against the Stage 4 results (page 1444 -> 5
    candidate regions, page 1100 -> 4)."""
    return lambda n: docs("aisc").pages[n - 1]
