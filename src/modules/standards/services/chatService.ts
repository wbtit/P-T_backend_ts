import prisma from "../../../config/database/client";
import { resolveProjectDocumentIds, generateEmbedding } from "./retrievalService";
import { retrieveTwoBranch, RetrievedChunk } from "./retrievalTwoBranch";
import {
  gradeRetrieval,
  buildAmbiguousDeferralAnswer,
  CragGradeResult,
  REASON_CODE_AMBIGUOUS_RETRIEVAL,
  REASON_CODE_UNRELIABLE_CHUNK,
  REASON_CODE_NOT_COVERED,
} from "./cragEvaluator";
import { rerank } from "./rerankerClient";
import { renderTableForRerank } from "./tableToProseCheck";
import { generateQueryRewrites } from "./queryRewrite";
import { StandardChunkType, StandardSourceType, StandardChatMessage, StandardChatAnswer } from "@prisma/client";

/**
 * Phase 5 §1.4 -- rerank-time-only transform, never touches stored
 * text_content/embeddings. TABLE candidates get the prose-rendered form
 * (fixes the confirmed format bias: raw pipe-grid text under-scores against
 * natural-language queries); PROSE/VISUAL candidates go through unchanged.
 */
async function rerankPool(queryText: string, pool: RetrievedChunk[]): Promise<RetrievedChunk[]> {
  const candidates = pool.map((c) => ({
    id: c.id,
    text: c.chunkType === "TABLE" ? renderTableForRerank(c.textContent).text : c.textContent,
  }));
  const scores = await rerank(queryText, candidates);
  const scoreById = new Map(scores.map((s) => [s.id, s.score]));
  return pool
    .map((c) => ({ ...c, score: scoreById.get(c.id) ?? c.score }))
    .sort((a, b) => b.score - a.score);
}

export type ChatMessageWithAnswers = StandardChatMessage & {
  answers: (StandardChatAnswer & { citations: any[] })[];
};

const TOP_N = 3;
/** Phase 6 -- how many distinct documents QUERY's results[] surfaces, not
 *  how many chunks. A number picked for a first build, not derived from
 *  anything measured -- flagged as adjustable, not a firm product decision. */
const RESULTS_CAP = 10;

function buildImagePath(hit: RetrievedChunk): string {
  return `/v1/standards/image/${hit.documentId}/${hit.pageStart}`;
}

/**
 * Phase 6 -- QUERY's product-facing response shape (Google-style: an AI
 * summary plus a ranked list of candidate documents), distinct from the
 * `ChatMessageWithAnswers` shape the pre-existing `/chat` endpoint still
 * returns unchanged (chat history persistence is a separate, working
 * feature, not being redesigned here). `askStandards()` now computes and
 * returns both from the same underlying pipeline run -- no second retrieval
 * pass, no duplicated logic.
 */
export interface QueryCandidate {
  documentId: string;
  documentName: string;
  documentFamilyId: string | null;
  familyCode: string | null;
  edition: string | null;
  chunkType: string;
  pageStart: number;
  pageEnd: number;
  imageUrl: string;
  /** Raw reranker cross-encoder score, NOT a calibrated [0,1] confidence --
   *  it's a logit and can be negative. Exposed as-is (useful for ranking/
   *  comparison across this response's own candidates) rather than silently
   *  rebranded as "confidence," which would overclaim calibration this
   *  project has never measured. Always a real number from live QUERY; `null`
   *  only from `/chat/history`'s reconstruction, where it was never
   *  persisted anywhere to recover. */
  score: number | null;
  isPrimarySource: boolean;
  /** Real external hyperlinks found on this page (`{uri, text}`), or `null`
   *  if none. `null` for all 16 pre-existing documents (checked directly:
   *  only 1 of 8 sampled real documents had any hyperlinks at all) and for
   *  any future page with zero real links. */
  hyperlinks: { uri: string; text: string | null }[] | null;
  /** 2-3 sentence LLM-generated page description (Google-image-search
   *  style), or `null`. FUTURE DOCUMENTS ONLY -- `null` for all 16
   *  pre-existing documents by design, never backfilled; also `null` for any
   *  future page with zero real text/OCR content (generating from nothing
   *  produced a confirmed hallucination during design testing). */
  pageDescription: string | null;
}

export interface AskStandardsResult {
  message: ChatMessageWithAnswers;
  aiSummary: string | null;
  deferralReason: string | null;
  results: QueryCandidate[];
  /** True only when a rewrite candidate actually rescued an AMBIGUOUS/empty
   *  original query to CONFIDENT and was used for the returned answer --
   *  never true just because rewriting was attempted. */
  queryRewritten: boolean;
  /** The exact rewrite text that produced the returned answer, or `null` if
   *  no rewrite happened (original query was already CONFIDENT, or no
   *  rewrite rescued it). Lets a frontend show "we searched for: X". */
  effectiveQuery: string | null;
}

/** The exact plain-language `deferralReason` strings askStandards() returns
 *  live, named so `/chat/history` (which reconstructs this shape from
 *  persisted data, not a live pipeline run) can map back to the same text
 *  instead of a second, hand-copied set of strings drifting out of sync. */
export const DEFERRAL_TEXT = {
  NO_DOCUMENTS: "No standards are currently available for this project.",
  EMPTY_POOL: "No matching content found for this query.",
  AMBIGUOUS_RETRIEVAL:
    "Retrieval could not confidently distinguish the best match from close competitors -- showing top candidates instead of a synthesized answer.",
  UNRELIABLE_CHUNK:
    "The best-matching content could not be verified as reliable (an extraction-quality issue, not a retrieval miss) -- see the page image directly.",
  NOT_COVERED: "The retrieved content does not appear to directly answer this query.",
} as const;

/** The two fixed `answerText` strings written by the no-documents/empty-pool
 *  early-return paths below -- neither sets `generationFailureReason` (they
 *  aren't CRAG deferrals, just structural "nothing to search" states), so
 *  `/chat/history`'s reconstruction distinguishes them from a genuine
 *  generated answer by exact string match against these, not a reason code. */
export const STRUCTURAL_DEFERRAL_ANSWER_TEXT = {
  NO_DOCUMENTS: "No standards are currently available.",
  EMPTY_POOL: "Not covered by this standard.",
} as const;

/** Dedup-by-document (the product spec asks for "candidate documents," not
 *  one row per chunk) + cap at `RESULTS_CAP`, sorted by score descending.
 *  Extracted from `buildResults()` so citation persistence (below) can
 *  persist the EXACT SAME set `results[]` shows live, not a smaller subset --
 *  see the real bug this fixed, documented on `reconstructHistoryEntry()`. */
function dedupedTopPool(pool: RetrievedChunk[]): RetrievedChunk[] {
  const bestByDoc = new Map<string, RetrievedChunk>();
  for (const c of pool) {
    const existing = bestByDoc.get(c.documentId);
    if (!existing || c.score > existing.score) bestByDoc.set(c.documentId, c);
  }
  return [...bestByDoc.values()].sort((a, b) => b.score - a.score).slice(0, RESULTS_CAP);
}

/** Almost all of this is already computed by `retrieveTwoBranch()` + the
 *  reranker -- pdfName/chunkType/pageStart/pageEnd/score were already on
 *  every `RetrievedChunk`. The one genuinely new piece is family/edition
 *  (added to retrievalTwoBranch.ts's SQL this pass, via a LEFT JOIN to
 *  standard_families -- previously computed nowhere). This function's real
 *  job is shaping `dedupedTopPool()`'s output, not new retrieval work. */
function buildResults(pool: RetrievedChunk[], primaryDocumentId: string | null): QueryCandidate[] {
  return dedupedTopPool(pool).map((c) => ({
    documentId: c.documentId,
    documentName: c.pdfName,
    documentFamilyId: c.documentFamilyId,
    familyCode: c.familyCode,
    edition: c.edition,
    chunkType: c.chunkType,
    pageStart: c.pageStart,
    pageEnd: c.pageEnd,
    imageUrl: buildImagePath(c),
    score: c.score,
    isPrimarySource: c.documentId === primaryDocumentId,
    hyperlinks: c.hyperlinks,
    pageDescription: c.pageDescription,
  }));
}

/** Real bug fix: persist the SAME set `results[]` shows live (up to
 *  `RESULTS_CAP`=10, deduped by document) as citations, not a smaller
 *  cited-only subset -- see this function's callers below and
 *  `reconstructHistoryEntry()`'s docstring for the full before/after. */
function citationsForResults(rerankedPool: RetrievedChunk[]): ReturnType<typeof citationOf>[] {
  return dedupedTopPool(rerankedPool).map((c, i) => citationOf(c, i + 1));
}

/** Phase 5 §2 -- a candidate chunk's own text is untrustworthy, independent of
 *  how confidently it ranked: chunkType='VISUAL' (OCR'd, possible misread
 *  glyphs) or Amendment 11's reliabilityReason set (vector text whose word
 *  order could not be verified). Hard, deterministic, non-LLM check -- this
 *  project already found once (spec Phase 2 §5) that asking the model to
 *  self-regulate confidence on this exact class of problem didn't hold up. */
export function isUnreliable(c: RetrievedChunk): boolean {
  return c.chunkType === "VISUAL" || c.reliabilityReason != null;
}

async function generateAnswerText(chunks: RetrievedChunk[], queryText: string): Promise<{ text: string | null, sourceChunkIndex: number | null }> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://192.168.1.11:11434";

  // Every chunk reaching this point already survived isUnreliable() filtering
  // (Phase 5 §2) -- so there is no VISUAL/reliabilityReason content left to
  // hedge here. The soft hedge this block used to carry is gone entirely,
  // not weakened: an untrustworthy chunk now never reaches generation at all.
  const contextBlocks = chunks.map((c, i) => `--- CHUNK ${i + 1} ---\n${c.textContent.substring(0, 2000)}`).join("\n\n");

  const prompt = `You are a structural steel detailing assistant.
IMPORTANT RULES:
1. ONLY answer using the provided chunks' text.
2. If NONE of the chunks clearly and directly contain the answer to the question, you MUST say so plainly rather than guessing or inferring from adjacent context. Reply exactly with: "Not covered by this standard."
3. Do not hallucinate or guess.
- DO NOT include the phrase "Not covered by this standard" in your response if you actually answered the query.
- If you do find the answer in one of the chunks, you MUST append "[Source: Chunk X]" to the very end of your response, where X is 1, 2, or 3 depending on which chunk provided the answer.

CONTEXT:
${contextBlocks}

QUERY: ${queryText}
`;

  console.log(`\n[ChatService] ---- LLM GENERATION REQUEST ----`);
  console.log(`[ChatService] Query: "${queryText}"`);
  console.log(`[ChatService] Passing ${chunks.length} context chunks to LLM:`);
  chunks.forEach((c, i) => {
    console.log(`  - Chunk ${i + 1}: Page ${c.pageStart}, Score ${c.score.toFixed(4)}, Type: ${c.chunkType}, Branch: ${c.branch}`);
  });
  console.log(`[ChatService] Prompt starts with:\n${prompt.substring(0, 200)}...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:latest",
        prompt: prompt,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[ChatService] LLM generation failed with status: ${response.status}`);
      return { text: null, sourceChunkIndex: null };
    }

    const data = await response.json() as { response: string };
    let text = data.response?.trim();
    console.log(`[ChatService] Raw LLM response: "${text}"`);
    if (!text || text === "Not covered by this standard.") {
      return { text: null, sourceChunkIndex: null };
    }

    let sourceChunkIndex = null;
    const match = text.match(/\[Source:\s*Chunk\s*(\d)\]/i);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < chunks.length) {
        sourceChunkIndex = idx;
        console.log(`[ChatService] Successfully parsed attribution tag for Chunk ${sourceChunkIndex + 1} (Page ${chunks[sourceChunkIndex].pageStart}).`);
      } else {
        console.warn(`[ChatService] LLM attributed to out-of-bounds Chunk ${idx + 1}.`);
      }
      text = text.replace(/\[Source:\s*Chunk\s*\d\]/gi, '').trim();
    } else {
      console.warn(`[ChatService] LLM generated answer but omitted valid chunk attribution tag.`);
    }

    return { text, sourceChunkIndex };
  } catch (error: any) {
    console.warn(`[ChatService] LLM generation error: ${error.message}`);
    return { text: null, sourceChunkIndex: null };
  }
}

function citationOf(hit: RetrievedChunk, rank: number) {
  return {
    chunkType: hit.chunkType as StandardChunkType,
    citationPdfName: hit.pdfName,
    citationPageStart: hit.pageStart,
    citationPageEnd: hit.pageEnd,
    anchorPageStart: null,
    anchorPageEnd: null,
    imagePaths: [buildImagePath(hit)],
    rank,
  };
}

interface RetrievalPassResult {
  rerankedPool: RetrievedChunk[];
  /** `null` means an empty pool -- distinct from a real CragGradeResult, and
   *  never fed to gradeRetrieval() (which has no real notion of "empty";
   *  confirmed it would score an empty pool CONFIDENT via its own
   *  `rank1Score = pool[0]?.score ?? -Infinity` / `gap === null` fallback,
   *  which is wrong here -- empty-pool is its own terminal state, checked
   *  before reranking or grading ever run, same as the pre-rewrite code did). */
  grade: CragGradeResult | null;
}

/** One full embed -> retrieve -> rerank -> grade pass for a single query
 *  string, extracted so the rewrite loop below can run it again per
 *  candidate without duplicating the retrieval/rerank/grade logic itself.
 *  Reused for both the original query and each rewrite candidate. */
async function runRetrievalPass(queryText: string, documentIds: string[]): Promise<RetrievalPassResult> {
  const queryVec = await generateEmbedding(queryText);
  const pool = await retrieveTwoBranch(queryText, queryVec, documentIds, 5);

  if (pool.length === 0) {
    return { rerankedPool: [], grade: null };
  }

  const rerankedPool = await rerankPool(queryText, pool);
  const grade = gradeRetrieval(rerankedPool, { queryText });
  return { rerankedPool, grade };
}

/** Phase 6 -- conditional query rewrite, only ever invoked when the
 *  ORIGINAL query graded AMBIGUOUS or returned an empty pool (never on an
 *  already-CONFIDENT query -- no added latency for the common case).
 *
 *  Sequential, not parallel, deliberately: the reranker service is
 *  explicitly single-request-only (its own startup log says so), so
 *  concurrent calls would just queue behind each other at that layer, not
 *  actually run in parallel -- there is no real wall-clock win available
 *  from firing all 3 rewrite attempts at once, only real risk (an
 *  unreviewed concurrent-request path the reranker was never built for).
 *  Stops at the first rewrite that reaches CONFIDENT -- strictly faster than
 *  always running all 3 in the (common) case where an early candidate
 *  rescues it, and identical cost to running all 3 in the worst case where
 *  none do, so there is no scenario where "always run all 3" would have
 *  been faster. Measured real worst-case (3 sequential misses) latency is
 *  reported in specs/ -- this was fast enough that no further optimization
 *  (e.g. abandoning sequential for something riskier) was needed.
 *
 *  Returns the ORIGINAL pass's pool/grade unchanged if no rewrite rescues
 *  it -- the caller must not treat "a rewrite ran" as "a rewrite won." */
async function tryRewriteIfNeeded(
  originalQueryText: string,
  documentIds: string[],
  original: RetrievalPassResult
): Promise<{ chosen: RetrievalPassResult; queryRewritten: boolean; effectiveQuery: string | null }> {
  const needsRewrite = original.grade === null || original.grade.grade === "AMBIGUOUS";
  if (!needsRewrite) {
    return { chosen: original, queryRewritten: false, effectiveQuery: null };
  }

  console.log(`[ChatService] Original query graded ${original.grade === null ? "EMPTY_POOL" : original.grade.grade} -- attempting rewrite rescue.`);
  const rewriteResult = await generateQueryRewrites(originalQueryText);
  if (rewriteResult.error) {
    console.warn(`[ChatService] Query rewrite failed, falling back to original result: ${rewriteResult.error}`);
  }

  for (const candidate of rewriteResult.rewrites) {
    console.log(`[ChatService] Trying rewrite candidate: "${candidate}"`);
    const attempt = await runRetrievalPass(candidate, documentIds);
    if (attempt.grade !== null && attempt.grade.grade === "CONFIDENT") {
      console.log(`[ChatService] Rewrite rescued to CONFIDENT: "${candidate}"`);
      return { chosen: attempt, queryRewritten: true, effectiveQuery: candidate };
    }
  }

  console.log(`[ChatService] No rewrite candidate reached CONFIDENT -- falling back to the original query's result.`);
  return { chosen: original, queryRewritten: false, effectiveQuery: null };
}

export async function askStandards(
  projectId: string,
  queryText: string
): Promise<AskStandardsResult> {
  console.log(`[ChatService] Received query for projectId ${projectId}: "${queryText}"`);

  const message = await prisma.standardChatMessage.create({
    data: { projectId, queryText },
  });

  // Set once, right after the rewrite decision below settles -- `finish()`
  // closes over these so every return site doesn't need to pass them.
  let queryRewritten = false;
  let effectiveQuery: string | null = null;

  const finish = async (aiSummary: string | null, deferralReason: string | null, results: QueryCandidate[]): Promise<AskStandardsResult> => {
    const full = await prisma.standardChatMessage.findUniqueOrThrow({
      where: { id: message.id },
      include: { answers: { include: { citations: true } } },
    });
    return { message: full, aiSummary, deferralReason, results, queryRewritten, effectiveQuery };
  };

  // Phase 5 §1.3: pooled scope, no tier selection. Every ACTIVE GENERAL
  // document, org-wide, plus this project's fabricator's ACTIVE FABRICATOR
  // documents, auto-derived -- see resolveProjectDocumentIds's own docstring.
  const documentIds = await resolveProjectDocumentIds(projectId);
  console.log(`[ChatService] Resolved ${documentIds.length} in-scope document(s) for project ${projectId}.`);

  if (documentIds.length === 0) {
    // Per resolveProjectDocumentIds' docstring: this only happens if there are
    // zero ACTIVE GENERAL documents at all, a real ingestion-side problem, not
    // a normal per-project state -- one answer, not three tiers' worth of
    // distinct null-state messages, since there is only one scope now.
    await prisma.standardChatAnswer.create({
      data: {
        messageId: message.id,
        sourceType: "GENERAL",
        chunkType: "PROSE",
        answerText: STRUCTURAL_DEFERRAL_ANSWER_TEXT.NO_DOCUMENTS,
        pinnedDocumentId: null,
      },
    });
    return finish(null, DEFERRAL_TEXT.NO_DOCUMENTS, []);
  }

  // Phase 5 §1.4: gradeRetrieval() requires a pool "already sorted descending
  // by post-rerank score" -- runRetrievalPass()'s rerankPool() step still
  // guarantees that. Confirmed directly (not assumed) that this actually
  // resolves the pre-rerank cross-branch tie: before the reranker was wired,
  // every real query graded AMBIGUOUS (the best table candidate and best
  // prose candidate each separately normalized to exactly 1.0 under
  // combineDocumentResultsNormalized's per-branch min-max). The reranker
  // produces one real, unified score across every candidate regardless of
  // which branch found it, so that forced tie cannot recur structurally, not
  // just in the cases tested.
  const original = await runRetrievalPass(queryText, documentIds);
  console.log(
    original.grade === null
      ? `[ChatService] Original query: empty pool.`
      : `[ChatService] Original query CRAG grade: ${original.grade.grade} (gap=${original.grade.gap}, rank1=${original.grade.rank1Score}, rank2=${original.grade.rank2Score})`
  );

  // Phase 6 -- conditional rewrite. Only reaches here (and only calls the
  // LLM rewriter, adding latency) when the original query graded AMBIGUOUS
  // or returned an empty pool; an already-CONFIDENT original returns
  // `{ chosen: original, queryRewritten: false, effectiveQuery: null }`
  // immediately with no extra retrieval/rerank/LLM calls at all.
  const rewriteOutcome = await tryRewriteIfNeeded(queryText, documentIds, original);
  queryRewritten = rewriteOutcome.queryRewritten;
  effectiveQuery = rewriteOutcome.effectiveQuery;
  const { rerankedPool, grade } = rewriteOutcome.chosen;
  // The phrasing that actually produced this result -- the rewrite if one
  // rescued it, otherwise the user's original text. Used below for the final
  // LLM generation prompt: if a rewrite fixed retrieval, generation should
  // answer against that same clear intent, not the confusing original.
  const activeQueryText = effectiveQuery ?? queryText;

  if (grade === null) {
    // Empty pool, even after any rewrite attempts -- same terminal state and
    // same persisted answer shape the original (pre-rewrite) code used.
    const doc = await prisma.standardDocument.findFirst({
      where: { id: { in: documentIds }, status: "ACTIVE" },
    });
    await prisma.standardChatAnswer.create({
      data: {
        messageId: message.id,
        sourceType: (doc?.sourceType as StandardSourceType) ?? "GENERAL",
        chunkType: "PROSE",
        answerText: STRUCTURAL_DEFERRAL_ANSWER_TEXT.EMPTY_POOL,
        pinnedDocumentId: doc?.id ?? null,
      },
    });
    return finish(null, DEFERRAL_TEXT.EMPTY_POOL, []);
  }

  if (grade.grade === "AMBIGUOUS") {
    // Either the original was AMBIGUOUS and no rewrite rescued it, or (rarer)
    // the original had an empty pool and the best a rewrite could do was
    // reach a non-empty but still-AMBIGUOUS pool -- `rewriteOutcome` already
    // discarded that non-rescuing attempt and left `original` in place here,
    // so this is always the ORIGINAL query's own AMBIGUOUS result, never a
    // failed rewrite's -- satisfies "don't return a worse or random result
    // just because a rewrite ran."
    const top = rerankedPool[0];
    const deferral = buildAmbiguousDeferralAnswer({
      pdfName: top.pdfName,
      pageStart: top.pageStart,
      pageEnd: top.pageEnd,
      documentId: top.documentId,
    });
    await prisma.standardChatAnswer.create({
      data: {
        messageId: message.id,
        sourceType: top.sourceType as StandardSourceType,
        chunkType: top.chunkType as StandardChunkType,
        answerText: deferral.answerText,
        generationFailureReason: deferral.generationFailureReason,
        pinnedDocumentId: top.documentId,
        // Real bug fix: persist ALL of what results[] shows (up to
        // RESULTS_CAP=10, deduped by document), not just the top-1 cited
        // here for the deferral message -- /chat/history reconstructs
        // results[] from exactly these rows, so persisting only 1 meant
        // history showed 1 image where the original live response showed up
        // to 10. See reconstructHistoryEntry()'s docstring for the full fix.
        citations: { create: citationsForResults(rerankedPool) },
      },
    });
    return finish(
      null,
      DEFERRAL_TEXT.AMBIGUOUS_RETRIEVAL,
      buildResults(rerankedPool, top.documentId)
    );
  }

  // CONFIDENT (either the original query's own grade, or a rewrite's rescue).
  // Phase 5 §2 hard deferral: strip any candidate whose own text is
  // untrustworthy BEFORE generation ever sees it -- scoped per chunk, not per
  // page or per query, so a flagged PROSE chunk sitting beside a clean TABLE
  // chunk on the same page (Amendment 11's whole point) never suppresses the
  // table; only the flagged chunk itself is ever excluded.
  const topRanked = rerankedPool.slice(0, TOP_N);
  const reliable = topRanked.filter((c) => !isUnreliable(c));

  if (reliable.length === 0) {
    // Every top candidate is itself unreliable -- same hard, non-LLM deferral
    // as VISUAL_ONLY/AMBIGUOUS, pointed at the top candidate's own page image.
    const top = topRanked[0];
    await prisma.standardChatAnswer.create({
      data: {
        messageId: message.id,
        sourceType: top.sourceType as StandardSourceType,
        chunkType: top.chunkType as StandardChunkType,
        answerText: "Not confidently found in the retrieved context — see page image.",
        generationFailureReason: REASON_CODE_UNRELIABLE_CHUNK,
        pinnedDocumentId: top.documentId,
        // Same fix as the AMBIGUOUS branch above -- persist the full
        // results[]-equivalent pool, not just the top-1 cited candidate.
        citations: { create: citationsForResults(rerankedPool) },
      },
    });
    return finish(
      null,
      DEFERRAL_TEXT.UNRELIABLE_CHUNK,
      buildResults(rerankedPool, top.documentId)
    );
  }

  console.log(`[ChatService] Generating text from ${reliable.length}/${topRanked.length} reliable candidate(s)...`);

  // RESIDUAL RISK DOCUMENTATION
  // The system reduces but does NOT eliminate confident-wrong-answer risk on queries where retrieval doesn't rank the correct page first.
  // Measured residual rate: ~42% of such misranked queries (N=95 sample) still produce a confidently wrong answer rather than a correct answer or safe refusal.
  // This is a known, open, unresolved limitation — not a solved problem — and should be treated as such by anyone building on top of this system later.
  const genResult = await generateAnswerText(reliable, activeQueryText);

  const generatedText = genResult.text;
  const sourceChunk = genResult.sourceChunkIndex !== null ? reliable[genResult.sourceChunkIndex] : null;

  // Phase 6: previously left BOTH answerText null AND generationFailureReason
  // null in this case -- silently ambiguous between "the model declined" and
  // "something failed unnoticed." Found via the Phase 5 closing eval run's
  // own "LLM_DECLINED" bucket (5/22), fixed here, not left as discovered.
  const declined = generatedText === null;

  const answer = await prisma.standardChatAnswer.create({
    data: {
      messageId: message.id,
      sourceType: (sourceChunk?.sourceType ?? reliable[0].sourceType) as StandardSourceType,
      chunkType: (sourceChunk ? sourceChunk.chunkType : reliable[0].chunkType) as StandardChunkType,
      answerText: generatedText,
      generationFailureReason: declined ? REASON_CODE_NOT_COVERED : null,
      pinnedDocumentId: sourceChunk ? sourceChunk.documentId : null,
      // Real bug fix: persist the full results[]-equivalent pool (up to
      // RESULTS_CAP=10, deduped by document, from the FULL rerankedPool --
      // the same pool buildResults() below uses for the live response), not
      // just `reliable` (the TOP_N=3, reliability-filtered subset actually
      // used for generation above). Generation and citation-persistence are
      // deliberately decoupled here: what the LLM is allowed to read from is
      // still narrowly, deterministically filtered (Phase 5 §2's hard
      // deferral, unchanged); what chat history shows as candidate documents
      // is the full live results[] set, exactly as QUERY showed it.
      citations: { create: citationsForResults(rerankedPool) },
    },
  });

  console.log(`[ChatService] ---> Final Assigned Source: Document ID = ${answer.pinnedDocumentId}, ChunkType = ${answer.chunkType}`);

  return finish(
    generatedText,
    declined ? DEFERRAL_TEXT.NOT_COVERED : null,
    buildResults(rerankedPool, sourceChunk ? sourceChunk.documentId : null)
  );
}

/** `/chat/history` reconstruction -- maps one persisted message's single
 *  answer (+ its citations) back to QUERY's live response shape, since
 *  askStandards() is now the only write path (the old `/chat` route that
 *  unwrapped to the pre-pivot single-answer shape was removed) and the
 *  frontend should see one consistent shape everywhere.
 *
 *  This is a REAL, STRUCTURAL APPROXIMATION of the live shape, not a replay
 *  of it -- confirmed directly against the schema before writing this:
 *  - `results[]` here is now the FULL results[] pool (up to RESULTS_CAP=10,
 *    deduped by document) -- fixed from an earlier, real bug where only the
 *    actually-cited subset (`TOP_N`=3, or 1 for a deferral, or 0) was
 *    persisted, so chat history showed up to 3 images for a query that
 *    originally showed up to 10 live. `askStandards()` now persists every
 *    `citationsForResults(rerankedPool)` row at answer-creation time, the
 *    same deduped/capped pool `buildResults()` shapes for the live response
 *    -- not a smaller, generation-scoped subset. Verified with a real
 *    before/after this session: a real query returning N images live, then
 *    `/chat/history` for that same message showing the same N images.
 *  - `score` is never persisted on `StandardChatCitation` (the reranker's
 *    score is purely an in-memory value at query time) -- always `null` here,
 *    not a bug, not omitted by oversight.
 *  - `documentFamilyId`/`familyCode`/`edition` are NOT stored on the citation
 *    row either; this function requires the caller to pass a lookup map (a
 *    single batched query across the whole history page) rather than doing
 *    it here per-citation.
 *  - `documentId` is recovered by parsing it out of the citation's own
 *    `imagePaths[0]` (`/v1/standards/image/<documentId>/<page>`, exactly how
 *    `citationOf()` builds it) -- not stored as its own column on
 *    `StandardChatCitation` at all.
 *  - `queryRewritten`/`effectiveQuery` are always `false`/`null` here --
 *    whether a query rewrite fired, and what it rewrote to, is not persisted
 *    anywhere (`StandardChatMessage.queryText` stores only the user's
 *    original input), so it cannot be recovered for history either. */
export function reconstructHistoryEntry(
  message: { id: string; queryText: string; createdAt: Date },
  answers: Array<{
    answerText: string | null;
    generationFailureReason: string | null;
    pinnedDocumentId: string | null;
    citations: Array<{
      chunkType: string;
      citationPdfName: string;
      citationPageStart: number;
      citationPageEnd: number;
      imagePaths: string[];
    }>;
  }>,
  familyByDocumentId: Map<string, { documentFamilyId: string | null; familyCode: string | null; edition: string | null }>,
  /** Same treatment as `familyByDocumentId` above, one more batched lookup:
   *  hyperlinks/pageDescription aren't stored on StandardChatCitation either,
   *  so the caller passes a single batched query's results across the whole
   *  history page, keyed by `"${documentId}:${pageNumber}"`. */
  pageByDocumentIdAndPage: Map<string, { hyperlinks: { uri: string; text: string | null }[] | null; pageDescription: string | null }>
): { messageId: string; queryText: string; createdAt: Date; aiSummary: string | null; deferralReason: string | null; results: QueryCandidate[]; queryRewritten: boolean; effectiveQuery: string | null } {
  const answer = answers[0] ?? null;

  let aiSummary: string | null = null;
  let deferralReason: string | null = null;

  if (answer) {
    switch (answer.generationFailureReason) {
      case REASON_CODE_AMBIGUOUS_RETRIEVAL:
        deferralReason = DEFERRAL_TEXT.AMBIGUOUS_RETRIEVAL;
        break;
      case REASON_CODE_UNRELIABLE_CHUNK:
        deferralReason = DEFERRAL_TEXT.UNRELIABLE_CHUNK;
        break;
      case REASON_CODE_NOT_COVERED:
        deferralReason = DEFERRAL_TEXT.NOT_COVERED;
        break;
      default:
        // No reason code -- either a genuine generated answer, or one of the
        // two structural (no-documents / empty-pool) early returns, which
        // never set a code. Distinguish by exact text, not inference.
        if (answer.answerText === STRUCTURAL_DEFERRAL_ANSWER_TEXT.NO_DOCUMENTS) {
          deferralReason = DEFERRAL_TEXT.NO_DOCUMENTS;
        } else if (answer.answerText === STRUCTURAL_DEFERRAL_ANSWER_TEXT.EMPTY_POOL) {
          deferralReason = DEFERRAL_TEXT.EMPTY_POOL;
        } else {
          aiSummary = answer.answerText;
        }
    }
  }

  const results: QueryCandidate[] = (answer?.citations ?? []).map((cit) => {
    const match = cit.imagePaths[0]?.match(/\/image\/([^/]+)\//);
    const documentId = match ? match[1] : "";
    const family = familyByDocumentId.get(documentId);
    const page = pageByDocumentIdAndPage.get(`${documentId}:${cit.citationPageStart}`);
    return {
      documentId,
      documentName: cit.citationPdfName,
      documentFamilyId: family?.documentFamilyId ?? null,
      familyCode: family?.familyCode ?? null,
      edition: family?.edition ?? null,
      chunkType: cit.chunkType,
      pageStart: cit.citationPageStart,
      pageEnd: cit.citationPageEnd,
      imageUrl: cit.imagePaths[0] ?? "",
      score: null, // never persisted -- see docstring
      isPrimarySource: documentId !== "" && documentId === answer?.pinnedDocumentId,
      hyperlinks: page?.hyperlinks ?? null,
      pageDescription: page?.pageDescription ?? null,
    };
  });

  return {
    messageId: message.id,
    queryText: message.queryText,
    createdAt: message.createdAt,
    aiSummary,
    deferralReason,
    results,
    queryRewritten: false, // not persisted -- see docstring
    effectiveQuery: null, // not persisted -- see docstring
  };
}
