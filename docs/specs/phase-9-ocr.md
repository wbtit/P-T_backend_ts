# Phase 9: OCR for visual standards pages

## Status and boundary

This is the Phase 9 design review artifact. No Phase 9 implementation or fixture test is
included in this phase of work. After approval, tests will be written first, shown failing,
and reviewed before implementation. Phase 10 retrieval changes are out of scope.

Phase 9 adds OCR only to make already-VISUAL drawing content embed-able. It does not change
the PROSE/VISUAL classification contract, the production retrieval threshold of `0.6`, or any
user query text.

## Pre-OCR retrieval baseline

The committed measurement harness is
[`test/standards-retrieval-baseline.test.ts`](../../test/standards-retrieval-baseline.test.ts).
It measures raw nearest-neighbour similarity so below-threshold target pages remain visible.
The run dated 2026-08-12 recorded:

| Query | GSMS 8703 top-1 / expected target | MM 0207 top-1 / expected target |
| --- | --- | --- |
| `column without cap plate` | 0.483230 p7 / **0.407941 p18** | 0.531943 p13 / — |
| `later wide gage standard angles` | 0.479097 p2 / **0.396299 p12** | 0.553150 p8 / — |
| `what are the drawing presentation requirements?` | 0.560656 p9 / — | 0.561022 p56 / — |
| `What sheet sizes should I use for detail drawings?` | 0.571053 p11 / — | 0.739919 p2 / 0.739919 p2 |
| `How do I calibrate a marine GPS compass?` | 0.384871 p1 | 0.452533 p8 |
| `steel recipe and carbon content` | 0.478505 p33 | 0.633515 p66 / 0.633515 p66 |

MM page 66 is not a false positive. Its extracted text is an American Galvanizers Association
section, “Materials Suitable for Galvanizing,” that explicitly says carbon levels below 0.25%
are beneficial and explains how steel composition affects galvanizing. The carbon-content query
therefore has a true positive above 0.6; the prior “known false positive” label is incorrect.

## OCR eligibility

The existing classifier’s `<400` character and `<4.5` words-per-line values remain classification
cutoffs only. Phase 9 has no OCR character threshold, no header stripping, and no
`getOcrEligibilityText()` helper.

The OCR trigger is simply:

```ts
page.classification === "VISUAL"
```

This deliberately runs OCR on **every** VISUAL page. A page with useful native text merely gains
redundant OCR text in the combined chunk; it cannot lose native text or change classification.
This removes filename-coupled boilerplate handling and every threshold boundary. It follows the
central reliability rule for this phase: no content-based scoping is allowed to decide which
VISUAL drawings receive OCR.

The data supports avoiding an eligibility threshold. The 50–99 band contains 221 VISUAL and zero
PROSE pages. The 100–199 band contains 129 VISUAL, zero PROSE, and one unclassified page.
Representative VISUAL MM pages p1 (101 characters), p8 (116), p9 (115), and p10 (182) contain
only the repeated Marvin header/page number plus a drawing title or no useful body text.

The repeated Marvin boilerplate remains embedded in every existing chunk, so it can make
unrelated pages resemble one another and may contribute to the wrong top-1 result. Phase 9 does
not alter that embedded content; it is a Phase 10 retrieval-quality observation.

OCR runs on **every** VISUAL page. There is no heading grouping, heading deduplication, or
any other scoping. Headings are derived from the PDF text layer, so using them to scope OCR
fails precisely when CAD-flattened pages have no usable text layer; even non-empty headings are
not unique to a drawing artifact.

## Part A: CAD-flattened PDF pages

### Data model and migration

Add a nullable field to `StandardPage`:

```prisma
ocrText String? @map("ocr_text") @db.Text
```

There is no `prisma/migrations` directory in this repository. This project is therefore using an
unmanaged `prisma db push` workflow; `prisma migrate dev` is not applicable because it would
attempt to establish migration history against the shared Aiven database and can prompt for a
baseline/reset. It must not be run for Phase 9.

After the schema change is reviewed, the exact database workflow is:

1. Read-only preview: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`.
2. Review that the output is only `ADD COLUMN "ocr_text" TEXT` on `standard_pages`.
3. Obtain explicit approval to mutate the shared database.
4. Apply with `npx prisma db push --schema prisma/schema.prisma` (no `--accept-data-loss`).
5. Regenerate the client with `npx prisma generate --schema prisma/schema.prisma`.

If either the preview or `db push` reports a reset, destructive change, or data-loss warning,
the operation stops and is reported before anything is applied.

`textContent` remains the immutable pdf-parse result. OCR output is written only to `ocrText`.
This preserves idempotency: rerunning classification always evaluates the original text layer,
not a prior OCR result.

### Classification and OCR worker flow

The classification heuristic continues to receive `page.textContent` only. OCR output never
enters `classifyPageText()` and cannot change a page from VISUAL to PROSE.

After a page has been classified, the classification worker will process every VISUAL page in a
plain `for...of` loop. For each, it resolves the existing page PNG, invokes Tesseract with
`--psm 11`, and
updates that page’s `ocrText`. It must not use `Promise.all` or another concurrent OCR fan-out.
The existing queue-chain rule remains: an OCR/chunking dispatch failure is caught so it does not
turn an already-completed classification stage into a failed stage.

Three page-segmentation modes were evaluated empirically on both success-criteria pages. For
each mode, the measured input was the exact intended chunk text:

```ts
contextPrefix + [page.textContent, ocrStdout].filter(Boolean).join("\n\n")
```

Each input was embedded with `nomic-embed-text`, then compared by cosine similarity to the
unchanged baseline query. PSM 11 wins both target-page measurements, so it is selected despite
its visibly noisier p12 output.

| PSM | GSMS p18: `column without cap plate` | GSMS p12: `later wide gage standard angles` |
| --- | ---: | ---: |
| 3 | 0.714382 | 0.539860 |
| 6 | 0.712706 | 0.547376 |
| **11 (selected)** | **0.722407** | **0.560345** |

The modes do not disagree: PSM 11 is best on both pages. This is a retrieval-quality choice,
not a visual-output choice; p12 still includes noisy dimension fragments, but its complete
chunk produces the highest target similarity.

The following is raw **stdout** only, verbatim. Tesseract stderr diagnostics are not included
and must never be stored in `ocrText`.

#### GSMS p18, `--psm 6`

```text
Column without Cap Plate
1) Reference dimensions on left side & shop
dimensions on right side of picture
2)Show base plate on ist shop drawing picture.
3) Compass direction always on Face (A)
4) Information not needed on shop drawing.
5) Show for WF, S, & C shapes on
the Ist shop drawing picture.
6)Show dimension if less than 12”
7) Make Base PL Hole Patterns SQUARE
If Possible
pare 01-06-26
Sheet XIC Col w/no Cap Plate Struct Stds P.17
```

#### GSMS p18, `--psm 11`

```text
Column without Cap Plate

1) Reference dimensions on left side & shop

dimensions on right side of picture

2)Show base plate on ist shop drawing picture.

3) Compass direction always on Face (A)

4) Information not needed on shop drawing.

5) Show for WF, S, & C shapes on

the Ist shop drawing picture.

6)Show dimension if less than 12”

7) Make Base PL Hole Patterns SQUARE

If Possible

pate 01-06-26

Struct Stds P.17

Sheet XIC Col w/no Cap Plate
```

#### GSMS p18, `--psm 3`

```text
Column without Cap Plate

1) Reference dimensions on left side & shop
dimensions on right side of picture

2)Show base plate on ist shop drawing picture.

3) Compass direction always on Face (A)

4) Information not needed on shop drawing.

5) Show for WF, S, & C shapes on
the Ist shop drawing picture.

6)Show dimension if less than 12”

7) Make Base PL Hole Patterns SQUARE
If Possible

pate 01-06-26

Sheet XIC Col w/no Cap Plate Struct Stds P.17
```

#### GSMS p12, `--psm 6`

```text
= 2M TYP
hy JL REG SP UN
woh TT] oe swith 1%6" Holes
mot TU ce
tT] TE yng
moh TT EL a SLEC
toh TT TE | J.
oh TT with
rH 134" Holes
~ - - ~ + - |
S| Ss 6S] US| US} CUZ
SSS S823
Fae se 2 8 &
aN aN EN WS Sy EN y+
Check driving clearance ga §2 §2 ce} ga $2 bs
® bolts for b b
renter than ‘9% thick a 3 a x x x 4
¥Web(tw/2)| GOL | Standard Marks
| Ye to % | 2% |'709 [609 [509 [409 | 309 [209 | 109 |
| %e to % | 2% [706 [606 [506 [406 (306 [206 | |
| % to %e [2% [703 [603 [503 [403 303] |
Too sid angles are required fer pa whe reser Than % thick.
inimum angle punch gage = e angle thickness
Standard Beam Angles 5h6'o/c)
OSL ALWAYS 4”
Holes in OSL to be '%@X1” Horizontal Slots
ee
VX en en
on
i ee
Pt tT eowrencr ferent oT
PROJECT___Standards pant Ws. __Noted
LOCATION SHIP-DATE
CUSTOMER MADE BY pate 01-06-26
SHIP TO AUTH, BY DWGNO cont.no __STDS
_ Later Wide GA Std Angles Struct Stds P.11 7
```

#### GSMS p12, `--psm 11`

```text
2M TYP

aan

3%"LEG TYP UN

with '%g'9 Holes

2429"

J PG

with

EB

bse "® Holes

BN

aS

Sy

=

BN

Sy

aS

Sy

rs

Sy

Sy)

Ss

BS

es)

SN

SN

yy

SN

SN

SN

Check driving clearance

® bolts for beam webs

greater than %’ thick.

¥Web(tw/2)| GOL

Standard Marks

Ve to %

%e | 709

609 |509 | 409 | 309

209

109

%e to Ye

% | 706

606 |506 | 406 | 306

206

% to Ne

%e | 703

603 |503 | 403 | 303

Non-std angles are required for bm webs greater than %'thick.

le punch gage = 1% + the angle thickness

Minimum ™

tandar

Beam Angles(5'4"c/c)

OSL ALWAYS 4”

Holes in OSL to be '%@X1” Horizontal Slots

pts| DATE

USE

prs] DATE

USE

CONTRACT

oO

EXTRA TO CONT. 1

o

Standards

Noted

PROJECT

PAINT

HLS.

LOCATION

SHIP-DATE

CUSTOMER

MADE BY

pate 01-06-26

HIP TO

DWG.NO

T.NO

STDS

—_

Later Wide GA Std Angles

Struct Stds P.il

—_—
```

#### GSMS p12, `--psm 3`

```text
2M" TYP

a
=
f ”
Ss 3%"LEG TYP UN
iol with 146" Holes
Rol
ae 22M,"
”
i i, ; f° ith
ine wi
1346"6 Holes
Qu ou} ou A QI ou
- - ~ w]e . |
oO Oo fo} 5
2232 2a sg
Ss Ss SS NM SN SB ~
es] SS] OBS] RBS
sy MW WwW NV NV +
Check driving clearance ga §2 §2 ap) ga $2 Es
® bolts for beam webs a s + ~ y+ yt S
greater than %” thick. i 4 4 4 4 4
¥Web(tw/2)| GOL Standard Marks

Ye to % | 2% |'709 | 609 | 509 | 409 | 309 | 209 | 109
%e to Ye | 2% |706 | 606 | 506 | 406 | 306 | 206
% to Me | 2% | 703 | 603 [503 | 403 | 303

Won-std angles are required for bm webs greater than ¥"thick
Minimum angle punch gage = 1% + the angle thickness
Standard Beam Angles(5%'c/c)

OSL ALWAYS 4”
Holes in OSL to be '%@X1” Horizontal Slots

NO. NO.
IpTs| DATE USE prs| DATE USE

CONTRACT OO /exTRA TO coONT. O o
PROJECT Standards PAINT HLS, Noted
LOCATION SHIP-DATE
CUSTOMER MADE BY pate 01-06-26
HIP TO DWG.NO cont.no __STDS

AUTH. BY
Later Wide GA Std Angles Struct Stds P.11
```

The selected PSM 11 was re-benchmarked serially. GSMS p18 took 0.48 s and p12 0.63 s (0.56 s
mean). MM p8, p9, p10, and p24 took 1.01 s, 1.27 s, 0.84 s, and 0.76 s respectively (0.97 s
sample mean). Per-page cost is therefore content-dependent and bulk ingestion must remain
serialized.

The full-VISUAL policy has a small, quantified one-time cost compared with the discarded
eligibility rule:

| Intact document | VISUAL pages / former eligible pages | Sampled PSM 11 projection: all VISUAL | Former `<100`-after-header proposal |
| --- | ---: | ---: | ---: |
| GSMS `87037d…` | 31 / 26 | about 17 s (31 × 0.56 s) | about 15 s |
| MM `0207eb…` | 57 / 48 | about 55 s (57 × 0.97 s) | about 47 s |

The removed filter would save only about 2 seconds for GSMS and 8 seconds for MM while leaving
VISUAL drawings untreated. That tradeoff is not worth a permanent coupling to document headers.

OCR subprocess capture is stdout-only: implementation must use the Tesseract process stdout as
`ocrText`, keep stderr out of the embedding input, and treat a non-zero exit as an OCR failure.

The implementation will preserve this serialized execution because concurrent OCR competes with
embedding and generation on the same CPU.

### Chunking

Chunking retains the existing Phase 4 heading-context prefix, with heading detection reading
`textContent` only. The embedding input becomes:

```ts
const pageText = [page.textContent, page.ocrText].filter(Boolean).join("\n\n");
const embedText = contextPrefix + pageText;
```

`textContent` must not be discarded: it can retain reliable piece marks and sheet numbers that
OCR misreads. Pages with OCR text must no longer be skipped merely because their native text
layer is empty. `StandardChunk` needs no new fields: it already stores the embedding input,
document/page citation metadata, type, and source scope.

**Truncation and Context Limit:**
The embedding model `nomic-embed-text` defaults to a context limit of 2,048 tokens. During measurement, GSMS page 33 produced 5,349 characters of OCR text (measured at 2,203 tokens, a worst-case ratio of 2.43 characters per token due to OCR noise) and 2,289 characters of native `textContent`. This combined ~7,600-character string exceeded the 2,048-token limit and failed.

The maximum native `textContent` across the entire corpus is 5,176 characters (clean prose, which tokenizes efficiently at ~4 chars/token). Thus, native text alone never exceeds the limit, and the failure risk comes entirely from dense OCR.

To keep every stored embedding valid and leave the query path untouched, the implementation will **not** raise the `num_ctx` setting. Instead, it must enforce a conservative character cap sized from the measured worst-case ratio (2.43 chars/token). To safely guarantee the result stays under 2,048 tokens with a healthy margin, the total string length is capped at 4,000 characters (yielding ~1,650 tokens even for pure OCR noise).

The implementation must compute a dynamic budget for the OCR text:
`budget = 4000 - length(contextPrefix) - length(textContent)`
- If `budget > 0`, truncate **only** the `ocrText` to fit this budget before appending it.

**PROSE Branch Length Limit (Known Gap):** 
The chunking process applies this 4,000-character budget and truncation strictly to the VISUAL branch. The PROSE branch does NOT receive truncation logic. The maximum `textContent` across the current corpus is 5,176 characters. At an average of ~4 characters per token, this translates to roughly 1,300 tokens, which rests safely inside the `nomic-embed-text` limit of 2,048 tokens. Truncating PROSE pages to a strict limit would silently drop real, validated standard text, which is worse for system reliability than encountering a loud embedding failure on an edge-case massive page. If a PROSE page does eventually exceed the 2,048-token limit, the newly implemented loud-failure mechanism (where `generateEmbedding` throws on an empty API response) will safely fail the job as a backstop.
- Never truncate `textContent` or `contextPrefix`, as those contain the most reliable metadata and native extraction. 
- If truncation occurs, log a warning so silent content loss remains visible.

**Loud Failure Path:**
If `generateEmbedding` receives an error from the Ollama API (whether a non-200 HTTP response or a JSON response containing an `error` key) or receives an empty array, it must throw an exception. This error must be caught by the `chunking-queue` worker, which will then fail the job, emit a `FAILED` progress event, and mark the `StandardDocument` status as `FAILED`. The system must never silently write a `StandardChunk` with an empty or missing embedding.

## Part B: standalone image standards

Supported standalone image formats are PNG, JPG, and JPEG. `multerUploader.util.ts` already
recognizes their safe MIME types globally, but `standardsUploads` currently passes no
`allowedExtensions` argument to `createStreamUploader`; Phase 9 will make the standards-specific
allow-list explicit as `[".pdf", ".png", ".jpg", ".jpeg"]`. This keeps other otherwise-safe
upload types out of the standards ingestion pipeline.

The ingestion worker currently assumes every upload is a PDF and has no standalone-image branch.
It will gain one that saves the uploaded image as a single `StandardPage` with `pageNumber: 1`,
an image path suitable for the existing image endpoint, and empty `textContent`. `StandardPage`
does not have `pageStart`/`pageEnd`; its resulting single `StandardChunk` will use
`pageStart: 1` and `pageEnd: 1`. Ingestion does not invoke Tesseract.

The classification worker currently has no standalone-image short-circuit: it sends every page
to `classifyPageText()`. Extension detection will be contained in one new shared standards
helper, `src/modules/standards/services/standardDocumentType.ts`, whose
`isStandaloneStandardImage(storagePath)` recognizes `.png`, `.jpg`, and `.jpeg`. Both ingestion
and classification will call that helper; no other extension check is permitted. Classification
will then classify the one image page as VISUAL before the heuristic. That same page then, like every VISUAL page, takes the exact same serialized OCR path as a sparse PDF page—no
image-only OCR implementation is permitted.

`tests/fixtures/sample_diagram.png` is currently absent. Before Phase 9 tests are written,
Gowtham will supply it as a real CAD detail sheet exported as PNG with legible drawing labels
and dimensions. A generic screenshot or unrelated image is not an acceptable fixture.

## Success criteria

Based on the full-document dry run of all 31 GSMS VISUAL pages, the predicted outcomes are:

- **PASS**: GSMS page 18 is expected to win top-1 and comfortably clear 0.6 (predicted ~0.722) for `column without cap plate`. Phase 9 succeeds here by making VISUAL content embed-able.
- **EXPECTED PARTIAL**: GSMS page 12 is expected to NOT clear 0.6 and does NOT win top-1 for `later wide gage standard angles`. GSMS page 14 wins at ~0.577. This is a recorded, expected outcome, not a regression, and it does not block Phase 9 closure.
- The irrelevance query stays well below the 0.6 threshold (measured 0.3849 → 0.4387).

**Near-Duplicate Diagnosis:**
GSMS page 12 loses top-1 to page 14 because page 14 is "Early WGA Std Angles" (Sheet P.13) and page 12 is "Later Wide GA Std Angles" (Sheet P.11). There are four near-identical clip-angle pages differing by only single tokens (Early vs Later, Wide GA vs WGA) amid massive identical table content. OCR is not the failure here; near-duplicate discrimination is. Phase 9's scope is purely making VISUAL content embed-able. 

**Note for Phase 10**: Lexical keyword matching will need to handle OCR abbreviations (e.g., GA ↔ Gage, Std ↔ Standard) to properly disambiguate these near-identical pages.

## Operational recovery for intact pre-OCR documents

Because Phase 9 keeps `textContent` immutable and adds OCR in `ocrText`, the intact existing
documents do not require a re-upload or PDF rendering pass. After the schema and workers are
deployed, reprocess them in this order:

1. Run page classification for GSMS `87037d08-cbeb-4f43-9b32-7868f49b4ce2`; it writes OCR only
   for eligible VISUAL pages, then dispatches chunking.
2. Let that document’s chunking job replace its chunks and complete activation.
3. Run page classification for MM `0207eb4a-aa94-4ae0-8fd5-dd13d5ec2ab1`; it likewise reuses
   its existing rendered PNGs and native `textContent`, then dispatches chunking.
4. Let MM chunking replace its chunks and complete activation.

This reclassification/rechunking recovery path is deliberate: unlike the abandoned design, it
does not overwrite native extraction, re-render pages, or require a source-file upload.

## Test-first plan after approval

Tests will use a dedicated project/fabricator scope and only delete records and filesystem output
they create. They will cover the schema separation of `textContent` and `ocrText`, serialized OCR
on every VISUAL page, unchanged classification after reprocessing, combined chunk input,
PNG/JPG ingestion, the image short-circuit, and the retrieval success criteria above. The fixture
must be supplied before the standalone-image test is authored. The red test output will be shown
before implementation begins.

## Recorded out-of-scope defects

- ACTIVE GSMS document `029d…` and ACTIVE MM document `76cf…` have missing source PDFs and
  missing rendered page-PNG directories. They are currently broken for re-ingestion and visual
  answer serving.
- `StandardDocument` has no database uniqueness constraint enforcing the Phase 7 versioning
  invariant. The application-level activation service is the only enforcement.

Neither defect is fixed by Phase 9.
