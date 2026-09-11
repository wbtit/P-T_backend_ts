import prisma from "../../../config/database/client";
import { resolveProjectDocumentIds, generateEmbedding } from "./retrievalService";
import { retrieveTwoBranch, RetrievedChunk } from "./retrievalTwoBranch";
import { gradeRetrieval, buildAmbiguousDeferralAnswer, REASON_CODE_UNRELIABLE_CHUNK } from "./cragEvaluator";
import { rerank } from "./rerankerClient";
import { renderTableForRerank } from "./tableToProseCheck";
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

function buildImagePath(hit: RetrievedChunk): string {
  return `/v1/standards/image/${hit.documentId}/${hit.pageStart}`;
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

export async function askStandards(
  projectId: string,
  queryText: string
): Promise<ChatMessageWithAnswers> {
  console.log(`[ChatService] Received query for projectId ${projectId}: "${queryText}"`);

  const message = await prisma.standardChatMessage.create({
    data: { projectId, queryText },
  });

  const finish = () =>
    prisma.standardChatMessage.findUniqueOrThrow({
      where: { id: message.id },
      include: { answers: { include: { citations: true } } },
    });

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
        answerText: "No standards are currently available.",
        pinnedDocumentId: null,
      },
    });
    return finish();
  }

  const queryVec = await generateEmbedding(queryText);
  const pool = await retrieveTwoBranch(queryText, queryVec, documentIds, 5);

  if (pool.length === 0) {
    const doc = await prisma.standardDocument.findFirst({
      where: { id: { in: documentIds }, status: "ACTIVE" },
    });
    await prisma.standardChatAnswer.create({
      data: {
        messageId: message.id,
        sourceType: (doc?.sourceType as StandardSourceType) ?? "GENERAL",
        chunkType: "PROSE",
        answerText: "Not covered by this standard.",
        pinnedDocumentId: doc?.id ?? null,
      },
    });
    return finish();
  }

  // Phase 5 §1.4: gradeRetrieval() requires a pool "already sorted descending
  // by post-rerank score" -- this is now that pool. Confirmed directly (not
  // assumed) that this actually resolves the pre-rerank cross-branch tie:
  // before the reranker was wired, every real query graded AMBIGUOUS (the
  // best table candidate and best prose candidate each separately normalized
  // to exactly 1.0 under combineDocumentResultsNormalized's per-branch
  // min-max). The reranker produces one real, unified score across every
  // candidate regardless of which branch found it, so that forced tie cannot
  // recur structurally, not just in the cases tested.
  const rerankedPool = await rerankPool(queryText, pool);
  const grade = gradeRetrieval(rerankedPool, { queryText });
  console.log(`[ChatService] CRAG grade: ${grade.grade} (gap=${grade.gap}, rank1=${grade.rank1Score}, rank2=${grade.rank2Score})`);

  if (grade.grade === "AMBIGUOUS") {
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
        citations: { create: [citationOf(top, 1)] },
      },
    });
    return finish();
  }

  // CONFIDENT. Phase 5 §2 hard deferral: strip any candidate whose own text is
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
        citations: { create: [citationOf(top, 1)] },
      },
    });
    return finish();
  }

  console.log(`[ChatService] Generating text from ${reliable.length}/${topRanked.length} reliable candidate(s)...`);

  // RESIDUAL RISK DOCUMENTATION
  // The system reduces but does NOT eliminate confident-wrong-answer risk on queries where retrieval doesn't rank the correct page first.
  // Measured residual rate: ~42% of such misranked queries (N=95 sample) still produce a confidently wrong answer rather than a correct answer or safe refusal.
  // This is a known, open, unresolved limitation — not a solved problem — and should be treated as such by anyone building on top of this system later.
  const genResult = await generateAnswerText(reliable, queryText);

  const generatedText = genResult.text;
  const sourceChunk = genResult.sourceChunkIndex !== null ? reliable[genResult.sourceChunkIndex] : null;
  const citationsData = reliable.map((hit, i) => citationOf(hit, i + 1));

  const answer = await prisma.standardChatAnswer.create({
    data: {
      messageId: message.id,
      sourceType: (sourceChunk?.sourceType ?? reliable[0].sourceType) as StandardSourceType,
      chunkType: (sourceChunk ? sourceChunk.chunkType : reliable[0].chunkType) as StandardChunkType,
      answerText: generatedText,
      pinnedDocumentId: sourceChunk ? sourceChunk.documentId : null,
      citations: { create: citationsData },
    },
  });

  console.log(`[ChatService] ---> Final Assigned Source: Document ID = ${answer.pinnedDocumentId}, ChunkType = ${answer.chunkType}`);

  return finish();
}
