"""fabextract -- fabrication-standards PDF extraction service.

One PDF in, one JSON manifest per page out. Never writes to a database.

Module map to the spec:
    validity.py  §1  per-page text validity (EMPTY / UNMAPPED_GLYPH / DUPLICATE_TEXT)
    tables.py    §2-4 region detection, selective refinement, cell ordering
    ocr.py       §6  PaddleOCR for scanned pages (retrieval text only)
    outline.py   build item 2 -- outline-first heading detection
    manifest.py  per-page manifest assembly
    cli.py       entry point
"""
__all__ = ["validity", "tables", "ocr", "outline", "manifest", "cli"]
