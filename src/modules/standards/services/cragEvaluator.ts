/**
 * Phase 4 Step 3 -- CRAG-style retrieval evaluator, AMBIGUOUS grade only.
 *
 * Scope, agreed explicitly: this module grades retrieval confidence from the
 * post-rerank pool's own score gap and produces exactly two grades --
 * AMBIGUOUS (defer) and CONFIDENT (proceed to generation). It does NOT
 * attempt to catch confident-wrong answers (see CONFIDENT_WRONG_OPEN_ITEM
 * below) -- that's a known, documented gap, not an oversight.
 *
 * Not wired into chatService.ts yet, same as retrievalTwoBranch.ts -- this
 * is an isolated, testable Phase 4 module. chatService.ts still runs the old
 * retrieval path (searchStandards) and isn't touched here.
 */
import fs from "fs";
import path from "path";

/**
 * PROVISIONAL -- calibrated on n=2 (Q12, Q16) from a 4-document corpus.
 * Must be recalibrated once Phase 3b ingests more documents. Do not treat
 * as final.
 *
 * Measured on the full 22-question eval set (not just the n=2 calibration
 * pair): gap alone only reliably separates PASS from FAIL below ~0.1 and
 * above ~2 -- the band in between (0.1-2.0) contains both PASS and FAIL
 * cases at comparable gaps (e.g. Q17/Q18/Q19 PASS at 1.4-2.0 sit alongside
 * Q4/Q11/Q21 FAIL at 0.7-1.6), so 0.1 is deliberately conservative (favors
 * flagging AMBIGUOUS over missing it), not a tuned midpoint. Same-topic
 * embedding crowding (this threshold's actual target) is expected to worsen
 * as the corpus grows past 4 documents, which will both increase the number
 * of true AMBIGUOUS cases AND make more calibration data available -- this
 * value should move as that data comes in, not stay fixed by default.
 */
export const AMBIGUOUS_GAP_THRESHOLD = 0.1;

export type CragGrade = "AMBIGUOUS" | "CONFIDENT";

export interface CragGradeResult {
  grade: CragGrade;
  gap: number | null;
  rank1Score: number;
  rank2Score: number | null;
  reasonCode: "AMBIGUOUS_RETRIEVAL" | null;
}

/** Distinct from AMBIGUOUS_RETRIEVAL (this module) -- kept as a named
 *  constant purely so the two reason codes are typo-proof and greppable
 *  together. VISUAL_ONLY itself is set at ingestion time (extraction
 *  status, manifestChunking.ts), not by this module; it is not currently
 *  wired as a StandardChatAnswer.generationFailureReason value anywhere in
 *  chatService.ts today. AMBIGUOUS_RETRIEVAL is designed to be compatible
 *  with that same field once CRAG is wired in, not a claim that the
 *  VISUAL_ONLY code path already emits it. */
export const REASON_CODE_VISUAL_ONLY = "VISUAL_ONLY" as const;
export const REASON_CODE_AMBIGUOUS_RETRIEVAL = "AMBIGUOUS_RETRIEVAL" as const;

/** Phase 5 §2 -- wired live in chatService.ts, unlike the two above. A hard,
 *  deterministic, non-LLM deferral for a candidate chunk that is itself
 *  untrustworthy (chunkType='VISUAL', or Amendment 11's reliabilityReason
 *  set) -- same treatment VISUAL_ONLY pages were always meant to get (spec
 *  Phase 2 §5: "never attempt a number from a table we can't verify"), now
 *  actually enforced instead of only hedged in the generation prompt.
 *  Distinct from AMBIGUOUS_RETRIEVAL: that's about retrieval CONFIDENCE
 *  (multiple candidates too close to call); this is about a specific
 *  candidate's own TEXT FIDELITY, independent of how confidently it ranked. */
export const REASON_CODE_UNRELIABLE_CHUNK = "UNRELIABLE_CHUNK" as const;

/**
 * CONFIDENT-WRONG (Q23-class) -- explicit open item, not deferred silently.
 *
 * Proven, not assumed: Q6 (confidently correct) and Q23 (confidently wrong)
 * have statistically indistinguishable rank1-rank2 gaps (0.3396 vs 0.3457).
 * Gap-based grading cannot detect this failure mode by construction -- it's
 * not a calibration problem, it's the wrong signal for this failure shape.
 *
 * Two candidate second signals were measured and rejected -- do not
 * re-propose either without new evidence:
 *   - Absolute score threshold on rank-1 ("is this score unusually high"):
 *     rejected. Q9 (correct) scored 4.49, Q2 (technically wrong-at-1) 3.72,
 *     Q23 (wrong) 3.01, Q6 (correct) 0.40 -- absolute score is dominated by
 *     content-type/format scale (table-to-prose vs raw PROSE vs OCR VISUAL),
 *     not by correctness. No threshold separates right from wrong here.
 *   - Embedding-cosine agreement between generated answers: rejected, and
 *     it fails in the wrong direction. Measured: "not covered" vs "7 1/2
 *     inches" (genuine disagreement) = 0.42 similarity; "7 1/2 inches" vs
 *     "7.5 inches for chord 18-25" (same fact, reworded) = 0.57; "area is
 *     98.5 sq in" vs "area is 30.7 sq in" (different numbers, same
 *     template -- disagreement) = 0.83. Same-template-different-value scores
 *     HIGHER than same-value-different-template. nomic-embed-text picks up
 *     surface/style similarity, not numeric-value agreement -- backwards for
 *     a domain that's mostly numeric fact lookups.
 *
 * What's left, neither built nor validated:
 *   - Value-extraction + normalization (pull a canonical answer value from
 *     generation output, compare after unit/fraction normalization -- "7 1/2
 *     in" == "191 mm" == "7.5 in"). No extra generation call needed if
 *     folded into the existing prompt, but the normalization logic itself
 *     doesn't exist yet.
 *   - A third LLM-judge call ("do these two statements agree?"). Same
 *     latency profile as the generation calls already measured (~0.3-0.4s
 *     warm, ~6s cold) -- a real third cost layer, and its own accuracy on
 *     this domain is unmeasured.
 * Cost was measured and is not the blocker (marginal ~0.8s warm/cold either
 * way, VRAM fits with ~1.3GB headroom under concurrent reranker+generation
 * residency). The blocker is that neither remaining candidate is built or
 * validated. Left open for a later phase.
 */
export const CONFIDENT_WRONG_OPEN_ITEM = {
  status: "open, deferred",
  provenUndetectableBy: "score-gap grading",
  evidence: "Q6 gap=0.3396 (correct) vs Q23 gap=0.3457 (wrong) -- statistically indistinguishable",
  rejectedApproaches: [
    "absolute score threshold on rank-1 (Q9=4.49 correct, Q2=3.72 wrong-at-1, Q23=3.01 wrong, Q6=0.40 correct -- no separating threshold)",
    "embedding-cosine agreement between generated answers (0.42 for genuine disagreement vs 0.83 for different-value-same-template -- inverted)",
  ],
  unbuiltCandidates: [
    "value-extraction + unit/fraction normalization",
    "third LLM-judge call (real added cost, unvalidated accuracy)",
  ],
} as const;

interface PoolCandidate {
  score: number;
}

const LOG_PATH = path.join(__dirname, "..", "..", "..", "..", "logs", "crag_grades.ndjson");

/** Every graded query is logged regardless of outcome -- this is the
 *  recalibration data collection Phase 3b will need; it starts now, not
 *  when the threshold is revisited. */
function logCragGrade(entry: {
  queryId?: string | number;
  queryText?: string;
  gap: number | null;
  grade: CragGrade;
  rank1Score: number;
  rank2Score: number | null;
}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line);
  } catch (e: any) {
    console.warn(`[CragEvaluator] failed to write grade log: ${e.message}`);
  }
}

/**
 * Grades a reranked candidate pool. Requires the pool already sorted
 * descending by post-rerank score (bge-reranker-v2-m3 output), as produced
 * by the pipeline in retrievalTwoBranch.ts + the reranker step.
 *
 * Fewer than 2 candidates: no rank-2 to gap against, so no crowding signal
 * is possible by construction -- graded CONFIDENT, gap null. This is a
 * different situation from "0 candidates" (nothing retrieved at all),
 * which this function doesn't handle -- that's an existing pre-CRAG case.
 */
export function gradeRetrieval(
  pool: PoolCandidate[],
  context?: { queryId?: string | number; queryText?: string }
): CragGradeResult {
  const rank1Score = pool[0]?.score ?? -Infinity;
  const rank2Score = pool.length >= 2 ? pool[1].score : null;
  const gap = rank2Score === null ? null : rank1Score - rank2Score;

  const grade: CragGrade = gap !== null && gap < AMBIGUOUS_GAP_THRESHOLD ? "AMBIGUOUS" : "CONFIDENT";
  const reasonCode = grade === "AMBIGUOUS" ? REASON_CODE_AMBIGUOUS_RETRIEVAL : null;

  logCragGrade({
    queryId: context?.queryId,
    queryText: context?.queryText,
    gap,
    grade,
    rank1Score,
    rank2Score,
  });

  return { grade, gap, rank1Score, rank2Score, reasonCode };
}

/**
 * AMBIGUOUS deferral response shape -- parallel in spirit to how a
 * VISUAL_ONLY table defers at ingestion (don't guess; point at the source)
 * rather than a literal reuse of that ingestion-time code path. Shaped to
 * be compatible with StandardChatAnswer.generationFailureReason once this
 * is wired into chatService.ts; not itself a chatService.ts change.
 */
export interface AmbiguousDeferralAnswer {
  answerText: string;
  generationFailureReason: typeof REASON_CODE_AMBIGUOUS_RETRIEVAL;
  citationPdfName: string;
  citationPageStart: number;
  citationPageEnd: number;
  imagePaths: string[];
}

export function buildAmbiguousDeferralAnswer(topChunk: {
  pdfName: string;
  pageStart: number;
  pageEnd: number;
  documentId: string;
}): AmbiguousDeferralAnswer {
  return {
    answerText: "Not confidently found in the retrieved context — see page image.",
    generationFailureReason: REASON_CODE_AMBIGUOUS_RETRIEVAL,
    citationPdfName: topChunk.pdfName,
    citationPageStart: topChunk.pageStart,
    citationPageEnd: topChunk.pageEnd,
    imagePaths: [`/v1/standards/image/${topChunk.documentId}/${topChunk.pageStart}`],
  };
}
