"""Build item 7 -- OCR worker pool dispatch.

The real OCR path needs paddleocr and minutes of CPU, so these cover the
dispatch logic only: the cap is honoured, failures are reported rather than
raised out of the worker, and the serial path is taken at workers<=1.
"""
from fabextract import ocr as ocr_mod


def test_default_worker_cap_is_conservative():
    """~3.2GB RSS per worker on a 32GB box (spec §6). Raising this is a
    deliberate act, not a default."""
    assert ocr_mod.DEFAULT_MAX_WORKERS == 2


def test_empty_job_list_short_circuits():
    results, errors = ocr_mod.ocr_images_pooled([], max_workers=4)
    assert results == {} and errors == {}


def test_serial_path_used_at_one_worker(monkeypatch):
    calls = []
    monkeypatch.setattr(ocr_mod, "ocr_image", lambda p: calls.append(p) or f"text::{p}")
    results, errors = ocr_mod.ocr_images_pooled([(0, "a.png"), (1, "b.png")], max_workers=1)
    assert results == {0: "text::a.png", 1: "text::b.png"}
    assert errors == {}
    assert calls == ["a.png", "b.png"]


def test_worker_returns_error_instead_of_raising(monkeypatch):
    """A worker must not raise across the pool boundary -- the parent decides
    whether a failure aborts the run."""
    def boom(_path):
        raise RuntimeError("no paddleocr")
    monkeypatch.setattr(ocr_mod, "ocr_image", boom)
    results, errors = ocr_mod.ocr_images_pooled([(3, "x.png")], max_workers=1)
    assert results == {}
    assert "no paddleocr" in errors[3]
