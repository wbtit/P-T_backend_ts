# Phase 10: Retrieval Quality

## 1. Current State & The `askStandards` Question

**Question:** *Does `askStandards` return only the top-1 chunk per source, or every chunk above threshold?*

**Answer:** 
The vector search layer (`searchStandards` in `retrievalService.ts`) returns **up to 10 chunks per source** that exceed the threshold in SQL. However, `askStandards` (in `chatService.ts`) only consumes the **top-1 direct hit** for visual pages to generate the answer.
Because `searchStandards` returns a rich candidate set (where the correct Page 16 is already present at Rank 2), the ordering defect can be entirely fixed by re-ranking these candidates in memory before `askStandards` selects the top hit.

---

## 2. Part C: Evaluation Harness (MUST BE BUILT FIRST)

Before changing any thresholds or implementing reranking, we must build a formal evaluation suite in `test/standards-retrieval-baseline.test.ts`. This harness provides the ground-truth baseline to ensure we measure—rather than guess—whether a retrieval change helps or hurts.

### Design
1. **Eval Set Structure:** A list of test cases pairing a query with its `expectedPageStart` and a flag for whether it should return hits.
2. **Execution:** The harness runs `searchStandards` and logs the candidate set, computing Rank, Vector Score, and Hybrid Score.
3. **Eval Cases:**
   - `"column with cap plate"` → Expect Page 16 at Rank 1.
   - `"column without cap plate"` → Expect Page 18 at Rank 1 (currently correctly placed, must be kept as a guard).
   - `"what is the c/c of the standard beam angles"` → Expect any of physical pages 12, 13, 14, or 15 at Rank 1. (OCR successfully extracted variations of `5 1/2" c/c` and `3 1/2" c/c` on these pages).
   - `"what sheet sizes should I use for detail drawings"` → Expect Page 2 at Rank 1 (a strong passing case, currently 0.7399, must not regress).
   - `"minimum slab thickness"` → Expect 0 hits above threshold (concrete is not covered).
   - `"how do I calibrate a marine GPS compass"` → Expect 0 hits above threshold (the primary irrelevance guard).

The harness will record every current score as the pre-change baseline.

---

## 3. Part A: Lexical Reranking

**Requirement:** Lexical Reranking must be implemented and tuned against the harness *before* evaluating any threshold drops.

### Approach
We will implement a **Lexical + Vector Hybrid Reranker** over the retrieved candidate set. 

Relying solely on vector embeddings blurs strict semantic constraints (like "with" vs "without"). We will use a generic token overlap/BM25-style scorer combined with an abbreviation dictionary.

### Reranking Algorithm
1. **Tokenization & Normalization:**
   Convert query and chunk text (both `textContent` and `ocrText`) to lowercase, strip punctuation, and split into tokens.
2. **Abbreviation Dictionary:**
   Map structural detailing abbreviations to their full forms in both the query and chunk. 
   *(Note: This dictionary is a known maintenance surface. It will live in a centralized constants file, e.g., `src/utils/abbreviations.ts`, and will need extending per fabricator).*
   - `std` ↔ `standard`
   - `ga` ↔ `gage`
   - `pl` ↔ `plate`
   - `w/` ↔ `with`
   - `w/o` ↔ `without`
   - `c/c` ↔ `center to center`
3. **Hybrid Scoring:**
   Compute a final score: `finalScore = vectorSimilarity + (alpha * lexicalScore)`.
   The `alpha` multiplier will not be arbitrarily picked. It will be tuned by measuring its effect on the eval harness to ensure it correctly flips adjacent ranks without overriding strong vector signals.

---

## 4. Part B: Threshold Re-evaluation

Currently, `searchStandards` filters entirely in SQL using a single `0.6` threshold. This means the `c/c` pages (0.5650) were discarded before any analysis could rescue them.

To fix this, we separated the threshold into two distinct concerns:
1. **CANDIDATE Floor (0.45):** A low threshold applied in SQL to retrieve candidates for reranking.
2. **ACCEPTANCE Threshold (0.60):** A final threshold applied to the `finalScore` (Vector + Lexical) *after* reranking.

**Decision:**
With the lexical score saturating at 1.0 for the top hit of every legitimate eval case, accepting at `0.60` on `finalScore` (where `finalScore = vector + (0.05 * 1.0)`) is arithmetically identical to accepting at `0.55` on the raw vector score. 

The deferred threshold decision has been made via the reranker. This is significantly better than a flat drop of the acceptance threshold to `0.55` because a candidate page only receives the 0.05 threshold offset *if it actually contains the query terms*.

### Lexical Scores & Reranker Impact (at Alpha 0.05)

| Query | Top Hit Page | Lexical Score | Reranker Effect |
| --- | --- | --- | --- |
| column with cap plate | 16 | 1.0000 | **Changed Ordering** (Flipped p18 and p16) |
| column without cap plate | 18 | 1.0000 | Shifted Score Only (0.7224 → 0.7724) |
| what is the c/c of the standard beam angles | 13 | 1.0000 | Shifted Score Only (0.5650 → 0.6150) |
| What sheet sizes should I use for detail drawings? | 2 | 1.0000 | Shifted Score Only (0.7399 → 0.7899) |

## 5. Residual Risk & Future Improvements

At alpha 0.05, the working margin (the band between true positives and false positives) is extremely narrow. 
The highest-scoring false positive is "minimum slab thickness" at **0.5282**. It is boosted by the tokens "minimum" and "thickness" appearing incidentally on clip-angle pages. The lowest-scoring true positive is the "c/c" query at **0.6150**. 

This leaves a working band of roughly **0.087**, derived from a small six-query sample. 

**Future Improvement flagged: IDF Weighting**
Currently, the lexical score uses *unweighted coverage*, meaning common words like "minimum" or "thickness" boost a score just as heavily as a hyper-specific term like "c/c". IDF-style weighting (Inverse Document Frequency) is the obvious future improvement to penalize common structural terms and reward rare terms, widening this working band. It will not be built now, but remains the clearest next step if retrieval quality regressions occur.
