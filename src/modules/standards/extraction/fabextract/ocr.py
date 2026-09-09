"""Spec §6 -- scanned pages. PaddleOCR PP-OCRv5 mobile, CPU-only.

Retrieval-grade text only. OCR output makes a page findable by search; it NEVER
asserts cell values. Tables on scanned pages are always visual-only (spec §5).

Two operational constraints, both from Stage 5 measurements:
  - `enable_mkldnn=False` is required, not optional. Without it current
    paddlepaddle raises NotImplementedError from onednn_instruction.cc.
  - ~3.2GB RSS per worker. On a 32GB box that caps useful concurrency at ~2;
    discover this in config, not under load.
"""
import os

# Spec §6 operational note: ~3.2GB RSS per worker on a 32GB box.
DEFAULT_MAX_WORKERS = int(os.environ.get("FABEXTRACT_OCR_WORKERS", "2"))

DET_MODEL = "PP-OCRv5_mobile_det"
REC_MODEL = "PP-OCRv5_mobile_rec"

_ocr_singleton = None


def get_ocr():
    """Lazy singleton -- model load is seconds and ~3.2GB, so never construct one
    for a document that turns out to have no scanned pages."""
    global _ocr_singleton
    if _ocr_singleton is None:
        from paddleocr import PaddleOCR
        _ocr_singleton = PaddleOCR(
            text_detection_model_name=DET_MODEL,
            text_recognition_model_name=REC_MODEL,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            # Required: PIR/oneDNN backend crash on current paddlepaddle without it.
            enable_mkldnn=False,
        )
    return _ocr_singleton


def ocr_image(image_path):
    """Run OCR on one rendered page image. Returns the recognised text joined by
    newlines (empty string if nothing was recognised)."""
    ocr = get_ocr()
    out = ocr.predict(str(image_path))
    texts = []
    for res in out:
        rec = res.get("rec_texts", []) if hasattr(res, "get") else getattr(res, "rec_texts", [])
        texts.extend(rec)
    return "\n".join(texts)


# Page images are the product, not a debug artifact: showing the real page IS
# the visual-only fallback behaviour (spec §5), and standard_pages.image_path is
# NOT NULL, so every page needs one.
#
# PNG at 150 DPI, measured rather than assumed. On this corpus PNG is 4-5x
# SMALLER than JPEG -- these are line-art and text pages, where lossless
# compression beats JPEG's noise across flat regions. Measured means per page:
# Expansion_Anchor 50KB, completeconnectiondetails 21KB, AISC 36KB (JPEG: 272KB,
# 90KB, 213KB). Projected totals at 150 DPI: the two exit documents 2.4MB,
# AISC's 2325 pages ~82MB (JPEG would be 483MB). 150 DPI gives 1275x1650 on
# letter, which is legible for reading a table off the image.
PAGE_IMAGE_DPI = 150
PAGE_IMAGE_FORMAT = "PNG"

# OCR reads at a higher resolution than the display image; recognition accuracy
# is worth more than bytes here, and these renders are transient.
OCR_IMAGE_DPI = 200


def render_page_image(page, out_path, resolution=OCR_IMAGE_DPI):
    """Render a pdfplumber page to an image file."""
    page.to_image(resolution=resolution).save(str(out_path))
    return out_path


def render_all_pages(pdf, out_dir, indices=None, dpi=PAGE_IMAGE_DPI):
    """Render every page for display/fallback. Returns {page_index: path}.

    Skips a page whose image already exists, so re-running an ingest does not
    re-render a whole book.
    """
    from pathlib import Path
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = PAGE_IMAGE_FORMAT.lower()
    paths = {}
    todo = range(len(pdf.pages)) if indices is None else indices
    for i in todo:
        out = out_dir / f"page_{i:04d}.{ext}"
        if not out.exists():
            pdf.pages[i].to_image(resolution=dpi).save(str(out))
        paths[i] = str(out)
    return paths


def _ocr_one(args):
    """Process-pool worker. Each process builds its own PaddleOCR singleton on
    first use -- the model is not picklable and must not be shared."""
    page_index, image_path = args
    try:
        return page_index, ocr_image(image_path), None
    except Exception as e:  # returned, not raised: the parent decides policy
        return page_index, None, f"{type(e).__name__}: {e}"


def ocr_images_pooled(jobs, max_workers=None):
    """OCR many page images with bounded concurrency.

    `jobs` is [(page_index, image_path)]. Returns {page_index: text} and
    {page_index: error_string}.

    Concurrency is capped because each worker holds a full PaddleOCR instance at
    ~3.2GB RSS (spec §6). On a 32GB box the default of 2 leaves comfortable
    headroom alongside the parent process and pdfplumber; raising it is a
    deliberate act, not a default. A cap of 1 runs in-process and skips the pool
    entirely, which keeps single-document runs and tests cheap.
    """
    workers = max_workers or DEFAULT_MAX_WORKERS
    results, errors = {}, {}
    if not jobs:
        return results, errors

    if workers <= 1:
        for job in jobs:
            idx, text, err = _ocr_one(job)
            (errors if err else results)[idx] = err if err else text
        return results, errors

    # Spawn, not fork: paddle's threads do not survive fork cleanly.
    import multiprocessing as mp
    from concurrent.futures import ProcessPoolExecutor

    ctx = mp.get_context("spawn")
    with ProcessPoolExecutor(max_workers=workers, mp_context=ctx) as pool:
        for idx, text, err in pool.map(_ocr_one, jobs):
            (errors if err else results)[idx] = err if err else text
    return results, errors
