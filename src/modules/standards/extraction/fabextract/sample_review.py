"""Build item 5 -- verification sampling.

With one extractor there is no second opinion to disagree with, so verification
is a human spot-check, not an automated cross-validation. This samples N random
EXTRACTED tables per document into a review file that puts the page image next
to the extracted cells, so a person can compare them directly.

Deliberately not a UI. Output is one self-contained HTML file plus the rendered
page images; open it in a browser, read down the page, mark anything wrong.

    python -m fabextract.sample_review manifests/ --out review/ --n 10

Sampling is seeded so a review can be reproduced exactly, and the seed is
recorded in the output.
"""
import argparse
import html
import json
import random
import sys
from pathlib import Path

import pdfplumber


def load_manifests(manifest_dir):
    manifest_dir = Path(manifest_dir)
    out = []
    for p in sorted(manifest_dir.glob("page_*.json")):
        with open(p) as f:
            out.append(json.load(f))
    return out


def sample_tables(manifests, n, seed):
    """Pick N random EXTRACTED tables across the document. Returns
    [(page_index, table_index, table_dict)]."""
    candidates = []
    for m in manifests:
        if m["extractionStatus"] != "EXTRACTED":
            continue
        for ti, t in enumerate(m.get("tables", [])):
            if t.get("status") == "EXTRACTED":
                candidates.append((m["pageIndex"], ti, t, m))
    rng = random.Random(seed)
    if len(candidates) <= n:
        return candidates, len(candidates)
    return rng.sample(candidates, n), len(candidates)


def render_pages(pdf_path, page_indices, image_dir, resolution=120):
    image_dir = Path(image_dir)
    image_dir.mkdir(parents=True, exist_ok=True)
    paths = {}
    pdf = pdfplumber.open(str(pdf_path))
    for i in sorted(set(page_indices)):
        out = image_dir / f"page_{i:04d}.png"
        if not out.exists():
            pdf.pages[i].to_image(resolution=resolution).save(str(out))
        paths[i] = out
    return paths


def _grid_html(cells):
    rows = []
    for row in cells:
        tds = "".join(f"<td>{html.escape(c) if c else ''}</td>" for c in row)
        rows.append(f"<tr>{tds}</tr>")
    return f"<table class=grid>{''.join(rows)}</table>"


def build_review(pdf_path, manifest_dir, out_dir, n=10, seed=42, resolution=120):
    manifests = load_manifests(manifest_dir)
    if not manifests:
        raise SystemExit(f"no manifests found in {manifest_dir}")
    picked, total = sample_tables(manifests, n, seed)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    images = render_pages(pdf_path, [p for p, _, _, _ in picked],
                          out_dir / "images", resolution)

    doc_id = manifests[0].get("documentId", "?")
    parts = [f"""<!doctype html><meta charset=utf-8>
<title>Extraction review - {html.escape(str(doc_id))}</title>
<style>
 body{{font:14px/1.5 system-ui,sans-serif;margin:2rem;max-width:1600px}}
 .item{{border-top:2px solid #ccc;padding:1.5rem 0;display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.5rem;align-items:start}}
 .meta{{grid-column:1/-1;font-weight:600}}
 img{{max-width:100%;border:1px solid #999}}
 .cells{{overflow-x:auto}}
 table.grid{{border-collapse:collapse;font-size:12px}}
 table.grid td{{border:1px solid #bbb;padding:2px 5px;vertical-align:top;
                white-space:pre-wrap;max-width:260px}}
 .hint{{color:#555}}
</style>
<h1>Extraction review — {html.escape(str(doc_id))}</h1>
<p class=hint>{len(picked)} of {total} EXTRACTED tables, seed {seed}.
Compare each rendered page (left) against the extracted cells (right).
Cells are what would be asserted as values; the image is ground truth.</p>"""]

    for page_idx, t_idx, table, manifest in sorted(picked, key=lambda x: (x[0], x[1])):
        heading = (manifest.get("heading") or {}).get("heading")
        src = (manifest.get("heading") or {}).get("headingSource")
        img = images[page_idx].relative_to(out_dir)
        parts.append(f"""
<div class=item>
  <div class=meta>page {page_idx + 1} &middot; table {t_idx + 1} &middot;
    {table['nRows']}&times;{table['nCols']} &middot;
    refinement={table.get('refinementApplied')} &middot;
    rowHeightRatio={table.get('rowHeightRatio')}<br>
    <span class=hint>heading: {html.escape(str(heading))} ({html.escape(str(src))})</span></div>
  <div><img src="{img}" alt="page {page_idx + 1}"></div>
  <div class=cells>{_grid_html(table['cells'])}</div>
</div>""")

    out_file = out_dir / "review.html"
    out_file.write_text("\n".join(parts))
    summary = {"documentId": doc_id, "sampled": len(picked),
               "totalExtractedTables": total, "seed": seed,
               "pages": sorted({p for p, _, _, _ in picked})}
    (out_dir / "review_summary.json").write_text(json.dumps(summary, indent=2))
    return out_file, summary


def main(argv=None):
    p = argparse.ArgumentParser(description="Sample EXTRACTED tables for human review.")
    p.add_argument("manifest_dir")
    p.add_argument("--pdf", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--n", type=int, default=10)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--resolution", type=int, default=120)
    args = p.parse_args(argv)
    out_file, summary = build_review(args.pdf, args.manifest_dir, args.out,
                                     n=args.n, seed=args.seed, resolution=args.resolution)
    print(f"wrote {out_file}")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
