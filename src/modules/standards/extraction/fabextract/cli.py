"""Extraction CLI: one PDF in, one JSON manifest per page out on disk.

    python -m fabextract.cli DOC.pdf --out-dir manifests/

--dry-run is the DEFAULT and is the only mode this tool has: it writes manifests
and logs, nothing else. Python never writes to Postgres -- persistence is the TS
ingestion job's job, and it is the only thing that takes --commit. The flag is
accepted here so the contract is explicit and a caller cannot assume otherwise.
"""
import argparse
import json
import logging
import sys
import time
from pathlib import Path

import pdfplumber

from . import ocr as ocr_mod
from . import outline as outline_mod
from .manifest import build_page_manifest
from .validity import EMPTY

log = logging.getLogger("fabextract")


def _setup_logging(log_path, verbose):
    log.setLevel(logging.DEBUG if verbose else logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    if log_path:
        Path(log_path).parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_path)
        fh.setFormatter(fmt)
        log.addHandler(fh)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    log.addHandler(sh)


def extract_document(pdf_path, out_dir, min_edge_length=None, ocr=True,
                     image_dir=None, document_id=None, page_range=None,
                     skip_ocr_failures=False, ocr_workers=None, render_pages=True):
    """Extract one document to per-page manifests. Returns a summary dict."""
    pdf_path = Path(pdf_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    document_id = document_id or pdf_path.stem

    ocr_workers = ocr_workers or ocr_mod.DEFAULT_MAX_WORKERS

    started = time.perf_counter()
    pdf = pdfplumber.open(str(pdf_path))
    n_pages = len(pdf.pages)

    headings, heading_meta = outline_mod.detect_headings(pdf_path, plumber_pages=pdf.pages)
    log.info("document=%s pages=%d outlineResolved=%s outlineCoverage=%s fillApplied=%s "
             "regexDistinct=%s regexTrusted=%s headingCoverageRatio=%s "
             "noHeadingsDetected=%s maxRunLength=%s",
             document_id, n_pages, heading_meta.get("outlineEntriesResolved"),
             heading_meta.get("outlineCoverageRatio"), heading_meta.get("outlineFillApplied"),
             heading_meta.get("regexDistinctMatches"), heading_meta.get("regexTrusted"),
             heading_meta.get("headingCoverageRatio"),
             heading_meta.get("noHeadingsDetected"), heading_meta.get("maxRunLength"))
    if heading_meta.get("noHeadingsDetected"):
        log.warning("document=%s NO HEADINGS DETECTED -- chunks will have null anchors",
                    document_id)

    indices = range(n_pages) if page_range is None else page_range
    summary = {"documentId": document_id, "source": str(pdf_path), "nPages": n_pages,
               "headingMeta": heading_meta, "statuses": {}, "visualOnlyReasons": {},
               "ocrPages": 0, "ocrWorkers": ocr_workers or ocr_mod.DEFAULT_MAX_WORKERS,
               "manifests": []}

    # Every page gets a display image: showing the real page IS the visual-only
    # fallback (spec §5), and standard_pages.image_path is NOT NULL.
    page_image_dir = Path(image_dir) if image_dir else out_dir / "page_images"
    page_images = {}
    if render_pages:
        t_img = time.perf_counter()
        page_images = ocr_mod.render_all_pages(pdf, page_image_dir, indices=indices)
        log.info("document=%s rendered %d page images at %ddpi %s in %.1fs",
                 document_id, len(page_images), ocr_mod.PAGE_IMAGE_DPI,
                 ocr_mod.PAGE_IMAGE_FORMAT, time.perf_counter() - t_img)

    # A page with no text layer is a §6 scanned page: OCR it for retrieval,
    # never for cell values. Render the scanned pages first, then OCR them
    # through a bounded pool -- each worker holds a ~3.2GB PaddleOCR instance,
    # so concurrency is capped in config rather than discovered under load.
    ocr_texts = {}
    if ocr:
        from .validity import check_page as _check
        img_dir = out_dir / "_ocr_images"
        jobs = []
        for i in indices:
            if _check(pdf.pages[i])["status"] == EMPTY:
                img_dir.mkdir(parents=True, exist_ok=True)
                img_path = img_dir / f"page_{i}.png"
                ocr_mod.render_page_image(pdf.pages[i], img_path)
                jobs.append((i, str(img_path)))
        if jobs:
            log.info("document=%s ocrPages=%d workers=%d", document_id, len(jobs), ocr_workers)
            t_ocr = time.perf_counter()
            ocr_texts, ocr_errors = ocr_mod.ocr_images_pooled(jobs, max_workers=ocr_workers)
            log.info("document=%s OCR done pages=%d failed=%d elapsed=%.1fs",
                     document_id, len(ocr_texts), len(ocr_errors),
                     time.perf_counter() - t_ocr)
            if ocr_errors:
                for idx, err in sorted(ocr_errors.items()):
                    log.error("page=%d OCR failed: %s", idx, err)
                # A failure here is almost always systemic (missing paddleocr,
                # model download, OOM), not a property of one page. Continuing
                # would emit a full set of manifests with empty ocrText under a
                # clean exit code -- silent degradation, indistinguishable
                # downstream from a document with genuinely no recoverable text.
                if not skip_ocr_failures:
                    first = sorted(ocr_errors.items())[0]
                    raise RuntimeError(
                        f"OCR failed on {len(ocr_errors)} page(s), first: page "
                        f"{first[0]}: {first[1]}. Aborting rather than emitting "
                        f"manifests with silently empty ocrText. Pass "
                        f"--ocr-skip-failures to continue anyway."
                    )
                for idx in ocr_errors:
                    ocr_texts[idx] = ""
            summary["ocrPages"] = sum(1 for v in ocr_texts.values() if v)

    for i in indices:
        page = pdf.pages[i]
        ocr_text = ocr_texts.get(i)

        m = build_page_manifest(page, i, heading=headings[i] if i < len(headings) else None,
                                min_edge_length=min_edge_length, ocr_text=ocr_text,
                                document_id=document_id)
        m["imagePath"] = page_images.get(i)
        out_path = out_dir / f"page_{i:04d}.json"
        with open(out_path, "w") as f:
            json.dump(m, f, indent=2, default=str)
        summary["manifests"].append(str(out_path))

        st = m["extractionStatus"]
        summary["statuses"][st] = summary["statuses"].get(st, 0) + 1
        if m["visualOnlyReason"]:
            r = m["visualOnlyReason"]
            summary["visualOnlyReasons"][r] = summary["visualOnlyReasons"].get(r, 0) + 1

        # Structured per-page log line (build item 7).
        log.info("page=%d status=%s reason=%s validity=%s tables=%d rejected=%d "
                 "method=%s ms=%s",
                 i, st, m["visualOnlyReason"], m["validity"]["status"],
                 len(m["tables"]), len(m["rejectedRegions"]),
                 m["extractionMethod"], m["timingMs"])

    summary["elapsedSec"] = round(time.perf_counter() - started, 2)
    with open(out_dir / "_summary.json", "w") as f:
        json.dump(summary, f, indent=2, default=str)
    log.info("done document=%s statuses=%s reasons=%s ocrPages=%d elapsed=%ss",
             document_id, summary["statuses"], summary["visualOnlyReasons"],
             summary["ocrPages"], summary["elapsedSec"])
    return summary


def main(argv=None):
    p = argparse.ArgumentParser(description="Extract a PDF to per-page JSON manifests.")
    p.add_argument("pdf")
    p.add_argument("--out-dir", required=True)
    p.add_argument("--log-file")
    p.add_argument("--document-id")
    p.add_argument("--image-dir")
    p.add_argument("--min-edge-length", type=float, default=None,
                   help="Spec amendment 1 secondary guard. Disabled by default; "
                        "it closes nothing on the fixture suite and can merge real "
                        "columns at >=9pt.")
    p.add_argument("--no-ocr", action="store_true",
                   help="Skip PaddleOCR on scanned pages.")
    p.add_argument("--ocr-skip-failures", action="store_true",
                   help="Continue past OCR errors, leaving ocrText empty. Off by "
                        "default: a failure is usually systemic and silently empty "
                        "ocrText is indistinguishable from a page with no text.")
    p.add_argument("--no-render-pages", action="store_true",
                   help="Skip rendering display page images. They are required for "
                        "the visual-only fallback and for standard_pages.image_path.")
    p.add_argument("--ocr-workers", type=int, default=None,
                   help="Max concurrent PaddleOCR workers (~3.2GB RSS each). "
                        "Defaults to FABEXTRACT_OCR_WORKERS or 2.")
    p.add_argument("--pages", help="Comma-separated 0-indexed pages (debugging).")
    p.add_argument("--dry-run", action="store_true", default=True,
                   help="Default and only mode: write manifests, nothing else.")
    p.add_argument("--commit", action="store_true",
                   help="Rejected. Persistence belongs to the TS ingestion job.")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv)

    if args.commit:
        p.error("--commit is not valid here: this tool never writes to a database. "
                "Persistence is the TS ingestion job's responsibility.")

    _setup_logging(args.log_file, args.verbose)
    page_range = None
    if args.pages:
        page_range = [int(x) for x in args.pages.split(",")]

    extract_document(args.pdf, args.out_dir, min_edge_length=args.min_edge_length,
                     ocr=not args.no_ocr, image_dir=args.image_dir,
                     document_id=args.document_id, page_range=page_range,
                     skip_ocr_failures=args.ocr_skip_failures,
                     ocr_workers=args.ocr_workers,
                     render_pages=not args.no_render_pages)
    return 0


if __name__ == "__main__":
    sys.exit(main())
