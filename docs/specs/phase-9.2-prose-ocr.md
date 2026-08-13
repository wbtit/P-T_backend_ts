# Phase 9.2: PROSE OCR Coverage Gap

## Step 1: Confirm before fixing

The hypothesis that the handwritten-style items on GSMS Page 2 are CAD-flattened vector paths missed by text-layer extraction is **confirmed**.

Running Tesseract (`--psm 11`) on the rendered PDF images reveals the following:

- **GSMS Page 2**
  - **Native `textContent` length:** 829 characters
  - **OCR output length:** 1724 characters
  - **Result:** The numbered items 1-5 (including the "Provide gather sheets..." instruction) **do appear** perfectly in the raw OCR output. 
- **GSMS Page 10** (The only other PROSE page in GSMS)
  - **Native `textContent` length:** 789 characters
  - **OCR output length:** 780 characters
  - **Result:** Not a hybrid page. The native text layer fully captures the visual text.
- **MM PROSE Pages (Sample cases)**
  - **Page 4:** Native 1132 chars vs OCR 1330 chars (Diff: +198 chars)
  - **Page 6:** Native 4061 chars vs OCR 4197 chars (Diff: +136 chars)
  - **Page 7:** Native 2205 chars vs OCR 2318 chars (Diff: +113 chars)
  - **Page 15:** Native 442 chars vs OCR 1052 chars (Diff: +610 chars)

## Step 2: Quantify the corpus-wide gap

By comparing the native `textContent` length against the OCR output length for every PROSE page across both documents (using a threshold of >100 additional OCR characters):

- **GSMS**: 1 out of 2 PROSE pages is a hybrid losing content.
- **MM**: 13 out of 32 PROSE pages have OCR output substantially longer than their native text.

**Conclusion:** Hybrid pages (PROSE pages containing flattened vector text or image-based tables) are a systemic pattern, not an isolated outlier. A significant portion of the corpus is currently losing searchable content because Phase 9 OCR skips PROSE-classified pages entirely.

## Step 3: Proposals

The rules are strictly preserved: OCR text must never feed the classification heuristic, must land strictly in `ocrText` only, and `textContent` stays immutable. The decision is entirely about when to incur the compute cost of running OCR on PROSE pages, and when to incur the token/storage cost of embedding the results.

### Option A: OCR every page regardless of classification
- **How it works:** Run Tesseract unconditionally on all PROSE pages during ingestion and store the output in `ocrText`.
- **Cost:** Increases ingestion compute significantly. We have 34 PROSE pages in these two documents alone. Since OCR is currently skipped for PROSE, this directly scales up CPU time per document.
- **Benefit:** Dead simple. No fragile heuristics to maintain.

### Option B: OCR all PROSE pages, but threshold the embedding
- **How it works:** We must still OCR every page to measure the gap, but we only append the `ocrText` to the chunk and send it to the embedding model if `ocr_length > native_length + margin` (e.g., +100 chars).
- **Cost:** Requires the exact same ingestion compute (CPU time) as Option A, so it saves nothing on the first pass. It only saves downstream embedding API costs and vector DB storage space for redundant OCR text.

### Option C: Render-time heuristic detection
- **How it works:** Before running OCR, detect if the page has a high ratio of vector paths/shapes relative to text blocks, or if a PDF page contains embedded raster images (via `pdf2json` or similar metadata). If detected, flag as a "hybrid PROSE" page and run OCR.
- **Cost:** Requires discovering and maintaining a reliable indicator of flattened text from the PDF parsing stage. If successful, it saves both OCR CPU compute and embedding costs.

### Impact on the Evaluation Harness
Whichever option is chosen, injecting OCR text into PROSE chunks will mutate the textual payload sent to the embedding model. This guarantees that the vector embeddings for all affected PROSE pages will shift.

Because of this:
- The **MM sheet-sizes guard** (currently passing at `0.7399`) must be re-measured.
- Both **zero-hit guards** must be re-measured and re-baselined to ensure the newly added OCR text doesn't accidentally trigger a false positive above the `0.60` acceptance threshold.
- We cannot assume any PROSE-dependent evaluations will survive the embedding shift intact.
