# Phase 3: Structure-Aware Chunking for Dense Tables

## 1. Boundary Detection
Based on a direct inspection of the extracted OCR text for pages 22-50 of the AISC manual, the text layer **does** contain highly consistent structural markers.
For example, Page 23 contains:
```text
Table 1-1
W-Shapes
Dimensions
```
Page 24 contains:
```text
Table 1-1 (continued)
W-Shapes
Properties
```
**Finding:** We can reliably detect table boundaries using a regex matching `^Table \d+-\d+(?:\s+\(continued\))?` followed by the next 1-2 lines for the section title (e.g., "W-Shapes"). Chapter boundaries can similarly be detected via `^PART \d+` or `^SECTION \d+`.

## 2. Reuse of Existing Infrastructure
Currently, `chunking.ts` tracks a `lastHeading` state using a hardcoded list regex (`/^\d+\)\s+.+$/`), which works for GSMS/MM but completely misses AISC's structure.
**Proposal:** We will reuse this exact `lastHeading` state-tracking mechanism during the page-by-page chunking loop. By expanding the regex to `const headingRegex = /^(?:Table \d+-\d+(?: \(continued\))?|PART \d+|SECTION \d+|\d+\)\s+.+)$/i`, we can naturally group AISC pages under their respective tables without building a parallel chunking job from scratch.

## 3. Chunk Shape Decision (Row-Level Semantic Blocks)

**The Problem:** Grouping an entire 30-page table creates massive vector dilution (scores < 0.50). Conversely, isolating single pages splits the `Dimensions` (left page) from the `Properties` (right page). Furthermore, raw rows of numbers (`103000 6600...`) have no semantic meaning to the embedding model without their column headers, and OCR heavily degrades header alignment.

**Concrete Rule (Block-Level Fusion & K=V Injection):**
Instead of arbitrary chunking, the chunker will operate as a specialized structural parser for Part 1 Tables:
1. **Shape-Series Boundaries:** A "block" is defined as a contiguous group of shapes within a single series (e.g., all `W14` shapes). The parser will split the text whenever the nominal prefix changes (e.g., transitioning from `W14×730` to `W12×336`).
2. **Two-Page Spread Fusion:** The chunker will process pages concurrently in pairs (Page N and N+1). It will extract the `W14` rows from the Dimensions page (odd) and the corresponding `W14` rows from the Properties page (even), fusing them into a single, complete block.
3. **Dictionary-Driven K=V Injection:** The parser will use a hardcoded `TABLE_SCHEMAS` dictionary that defines the exact ordered array of values expected for each table type (e.g., accounting for dual decimal/fraction columns). It will parse the raw OCR row using a precise number regex (`\d+\s+\d+\/\d+|\d+\/\d+|[a-zA-Z0-9.\-]+`) and zip the values with the schema to produce K=V pairs: `Moment of Inertia I=103000, Section Modulus S=6600`.
4. **Explicit Identity Anchoring:** The chunker will inject the isolated shape group and plain-English noun at the top of the block so both the vector and lexical engines have strict tokens to grab.

*Example Output Chunk:*
```
[Table 1-1 W-Shapes (Wide Flange Beams) Dimensions and Properties]
Shape Group: W14
Shape: W14×730
Dimensions: Area A=215, Depth d=22.4, Depth d (frac)=22 3/8, ... Workable Gage=10
Properties: Moment of Inertia I=103000, Section Modulus S=6600 ...
```

## 4. Scope
This structure-aware chunking will apply **only** to chunks where a `Table` or `PART`/`SECTION` boundary is actively detected in the `lastHeading` state. 
Prose-heavy sections (like the fillet weld requirements) will naturally continue to function as standard page-level chunks, ensuring we don't disrupt the prose retrieval that was proven to work perfectly in Phase 1.

## 5. Re-Chunking Mechanics (Small Slice Test)
Before committing to re-chunking the entire 2,325-page manual, we will test this exclusively on the failing W-shapes section.
**The Plan:**
1. Write a targeted script (`test_rechunk_slice.ts`) that deletes chunks for AISC pages 18-50.
2. Run the new structure-aware chunking logic in-memory for those 33 pages only, prepend the `Table 1-1` headings, and re-embed them into the database.
3. Run the diagnostic query `"what is the gauge for the W14 beam"` and verify if a properties table page finally breaches the top-5 candidates.

## 6. Re-Measurement Plan
Once the small-slice test proves successful:
1. We will run the full 179-question benchmark (GSMS/MM) to rigorously confirm that expanding the `headingRegex` did not introduce regressions on smaller corpora.
2. We will run the new 10-question AISC test suite to ensure prose retrieval remains stable while table recall improves.
3. Only after both suites pass will we run the full AISC re-chunking job.
