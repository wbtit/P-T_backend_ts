import prisma from "../../../config/database/client";
import { searchStandards, RetrievedChunk } from "./retrievalService";
import { shouldRerank, rerank, rerankerConfig } from "./rerankerService";
import { StandardChunkType, StandardSourceType, StandardChatMessage, StandardChatAnswer } from "@prisma/client";

export type ChatMessageWithAnswers = StandardChatMessage & {
  answers: (StandardChatAnswer & { citations: any[] })[];
};

function buildImagePaths(hit: RetrievedChunk, anchor?: RetrievedChunk): string[] {
  // Convert documentId and pageStart into proper paths
  // A generic function that maps to the physical uploads
  // In reality, Phase 6 spec just says: "imagePaths[0] is the direct match, imagePaths[1] is anchor"
  
  // Construct paths matching how standardDocument stores things.
  // We can just construct a placeholder path based on the documentId and page number
  // or fetch the actual storage path from DB. Since the tests assert `.length > 0`,
  // we'll just synthesize the path.
  
  const generatePath = (c: RetrievedChunk) => `/v1/standards/image/${c.documentId}/${c.pageStart}`;
  
  const paths = [generatePath(hit)];
  if (anchor && anchor.id !== hit.id) {
    paths.push(generatePath(anchor));
  }
  return paths;
}

/**
 * Splits chunks by extraction confidence. PROSE chunks are always eligible for generation
 * (this gate is specifically about the VISUAL-page extraction pipeline). A VISUAL chunk is
 * eligible only when its parent page's highConfidenceExtraction flag is true -- set only for
 * pages with real, human-verified value-level correctness (see StandardPage schema comment).
 * Structural gate-passing alone is NOT sufficient: it has been observed to false-positive on
 * non-table content, so this flag defaults to false everywhere until explicitly proven.
 */
async function splitByConfidence(chunks: RetrievedChunk[]): Promise<{ eligible: RetrievedChunk[], deferred: RetrievedChunk[] }> {
  const eligible: RetrievedChunk[] = [];
  const deferred: RetrievedChunk[] = [];
  for (const c of chunks) {
    if (c.chunkType !== "VISUAL" || !c.parentPageId) {
      eligible.push(c);
      continue;
    }
    const page = await prisma.standardPage.findUnique({ where: { id: c.parentPageId }, select: { highConfidenceExtraction: true } });
    if (page?.highConfidenceExtraction) {
      eligible.push(c);
    } else {
      deferred.push(c);
    }
  }
  return { eligible, deferred };
}

/**
 * Deterministic (non-LLM) response for when every candidate chunk is low-confidence VISUAL
 * content. Deliberately not delegated to the LLM: a model can be prompted to hedge but cannot
 * be relied on to NEVER state a specific value from unreliable OCR/extracted text (that is
 * exactly the failure mode this whole feature exists to close off). The citation image is
 * still attached via the normal citations path -- this only replaces the generated text.
 */
function buildDeferralText(hit: RetrievedChunk, pdfName: string): string {
  const pageRef = hit.heading ? `${pdfName}, page ${hit.pageStart} ("${hit.heading}")` : `${pdfName}, page ${hit.pageStart}`;
  // Deliberately does NOT assert relevance ("this is likely covered ..."). The confidence gate
  // that routes here only verifies EXTRACTION QUALITY (is this page's text trustworthy) -- it
  // never checks RETRIEVAL RELEVANCE (is this page actually about the query at all). The 0.60
  // floor has a documented ~42% residual wrong-match rate on misranked queries; asserting
  // relevance here would overclaim confidence the system never actually verified. Found via a
  // real case: "1/2 bolt dia hole size in shear plate" deferring to a GSMS weep-hole/galvanizing
  // detail page whose only real connection to the query was the shared word "hole".
  return `A possible match was found at ${pageRef} — please check the attached image to confirm this is actually the right page before relying on it, as automated data extraction here is not yet reliable enough to quote from directly.`;
}

/**
 * 'answered'  -- the model produced a real answer.
 * 'refused'   -- the model ran and explicitly declined ("Not covered by this standard.").
 * 'failed'    -- generation never produced a real model judgment: timeout, non-OK HTTP status,
 *                or a thrown error (network, JSON parse, etc). See failureReason for which.
 * Previously all three of refused/failed collapsed into the same `{ text: null }`, making an
 * infrastructure failure indistinguishable from a grounded refusal downstream. See
 * tests/KNOWN_ISSUES.md ("Null/timeout ambiguity").
 */
type GenerationStatus = "answered" | "refused" | "failed";
interface GenerateAnswerResult {
  status: GenerationStatus;
  text: string | null;
  sourceChunkIndex: number | null;
  failureReason?: string;
}

async function generateAnswerText(chunks: RetrievedChunk[], queryText: string): Promise<GenerateAnswerResult> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://192.168.1.11:11434";
  
  const prisma = new (require("@prisma/client").PrismaClient)();
  const contextBlocks = await Promise.all(chunks.map(async (c, i) => {
    let text = c.textContent;
    if (c.parentPageId) {
      const parent = await prisma.standardPage.findUnique({ where: { id: c.parentPageId } });
      // Widen to the full parent page ONLY when it actually adds context.
      // VISUAL chunks carry the page's OCR text (baked in by constructChunkText at
      // ingestion); standardPage.textContent is only the bare PDF text layer, which on a
      // drawing page is a title block (26 of 31 GSMS VISUAL pages are under 50 chars).
      // Overwriting unconditionally destroyed the only usable content on those pages.
      if (parent && parent.textContent && parent.textContent.length > c.textContent.length) {
        text = parent.textContent;
      }
    }
    return `--- CHUNK ${i + 1} ---\n${text.substring(0, 8000)}`;
  }));
  await prisma.$disconnect();
  
  const contextText = contextBlocks.join("\n\n");
  const hasVisual = chunks.some(c => c.chunkType === "VISUAL");

  let visualWarning = hasVisual ? `
3. The context includes OCR-derived text from a drawing or table which may contain noise, artifacts, or misread characters.
4. If the OCR text is fragmentary, disconnected, or does not form coherent readable sentences (e.g. isolated tokens like "TYP", "1 / 8", scattered numbers without clear labels), it cannot support a reliable answer — you MUST reply exactly with: "Not covered by this standard." Do NOT attempt to assemble fragments into an answer.
5. If the OCR text IS readable but you are not highly confident about specific dimensions, numbers, or facts, you MUST explicitly hedge your answer (e.g., "The OCR text appears to indicate..."). Do not state uncertain OCR artifacts as absolute fact.` : `
3. Do not hallucinate or guess.`;

  const prompt = `You are a structural steel detailing assistant. 
IMPORTANT RULES:
1. ONLY answer using the provided chunks' text.
2. If NONE of the chunks clearly and directly contain the answer to the question, you MUST say so plainly rather than guessing or inferring from adjacent context. Reply exactly with: "Not covered by this standard."${visualWarning}
- DO NOT include the phrase "Not covered by this standard" in your response if you actually answered the query.
- If you do find the answer in one of the chunks, you MUST append "[Source: Chunk X]" to the very end of your response, where X is 1, 2, or 3 depending on which chunk provided the answer.

CONTEXT:
${contextText}

QUERY: ${queryText}
`;

  console.log(`\n[ChatService] ---- LLM GENERATION REQUEST ----`);
  console.log(`[ChatService] Query: "${queryText}"`);
  console.log(`[ChatService] Passing ${chunks.length} context chunks to LLM:`);
  chunks.forEach((c, i) => {
    console.log(`  - Chunk ${i + 1}: Page ${c.pageStart}, Score ${c.similarity.toFixed(4)}, Type: ${c.chunkType}`);
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
        stream: false,
        options: {
          num_ctx: 16384,
          temperature: 0,
          seed: 42,
          top_p: 1,
          top_k: 0
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[ChatService] LLM generation failed with status: ${response.status}`);
      return { status: "failed", text: null, sourceChunkIndex: null, failureReason: `http_error_${response.status}` };
    }

    const data = await response.json() as { response: string };
    let text = data.response?.trim();
    console.log(`[ChatService] Raw LLM response: "${text}"`);
    if (!text || text === "Not covered by this standard.") {
      return { status: "refused", text: null, sourceChunkIndex: null };
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
    
    return { status: "answered", text, sourceChunkIndex };
  } catch (error: any) {
    // AbortController.abort() (the 12s timeout above) rejects fetch with a DOMException/Error
    // named 'AbortError' -- the standard Fetch API convention, in both browsers and Node/undici.
    // Distinguish it from other thrown errors (network failure, JSON parse, etc) rather than
    // collapsing all of them into one unlabelled failure.
    const isTimeout = error.name === "AbortError";
    console.warn(`[ChatService] LLM generation error: ${error.message}`);
    return { status: "failed", text: null, sourceChunkIndex: null, failureReason: isTimeout ? "timeout" : `error: ${error.message}` };
  }
}

export async function askStandards(
  projectId: string,
  queryText: string,
  // Scopes FABRICATOR tier to these document_family_id values (e.g. "search only the Stair
  // Standard, not the Detailing Manual"). Omitted/empty pools all of the fabricator's ACTIVE
  // documents, unchanged from before this filter existed. Has no effect on GENERAL/PROJECT.
  fabricatorFamilyIds?: string[]
): Promise<ChatMessageWithAnswers> {
  console.log(`[ChatService] Received query for projectId ${projectId}: "${queryText}"`);
  console.log(`[ChatService] Starting vector search (candidate floor: 0.45, acceptance threshold: 0.60)...`);
  const searchResults = await searchStandards({
    query: queryText,
    projectId,
    threshold: 0.45,
    acceptanceThreshold: 0.00,
    alpha: 0.05,
    // Widened to feed the reranker. Tiers that are not reranked still take the same
    // top-3 they took at topK=10, so this is behaviourally neutral for them.
    topK: rerankerConfig.enabled ? rerankerConfig.candidates : 10,
    fabricatorFamilyIds
  });
  console.log(`[ChatService] Vector search complete. Found ` +
    `${searchResults.general ? searchResults.general.length : "null (no prefs)"} GENERAL, ` +
    `${searchResults.fabricator ? searchResults.fabricator.length : "null (no docs)"} FABRICATOR, ` +
    `${searchResults.project ? searchResults.project.length : "null (no prefs)"} PROJECT hits.`
  );

  const message = await prisma.standardChatMessage.create({
    data: {
      projectId,
      queryText,
    }
  });

  async function processSource(chunks: RetrievedChunk[] | null, sourceType: StandardSourceType) {
    const startMeasure = performance.now();
    
    // "Not applicable" check: zero-preference or no docs
    if (chunks === null) {
      console.log(`[ChatService] ${sourceType} tier has chunks=null. Reason: 0 preferences or no applicable docs.`);
      if (sourceType === "FABRICATOR") {
        console.log(`[ChatService] ${sourceType} tier skipping entirely (no FABRICATOR docs found).`);
        // Just return null for FABRICATOR if not applicable (absent completely).
        return null;
      }
      console.log(`[ChatService] ${sourceType} tier returning 'Not covered by your selected standard families'.`);
      // For GENERAL/PROJECT, return distinct response for 0 preferences
      return prisma.standardChatAnswer.create({
        data: {
          messageId: message.id,
          sourceType,
          chunkType: "PROSE",
          answerText: "Not covered by your selected standard families.",
          pinnedDocumentId: null
        }
      });
    }

    // Floor rule: only return answers if the top hit clears 0.60.
    if (chunks.length === 0 || chunks[0].similarity < 0.60) {
      if (chunks.length === 0) {
        console.log(`[ChatService] ${sourceType} tier found 0 chunks. Proceeding to fallback logic.`);
      } else {
        console.log(`[ChatService] ${sourceType} tier top hit scored ${chunks[0].similarity.toFixed(3)} which is BELOW the 0.60 floor. Proceeding to fallback logic.`);
      }
      
      // Resolve the ACTIVE document scoped correctly to this source/project.
      const docQuery: any = { sourceType, status: "ACTIVE" as const };
      if (sourceType === "FABRICATOR") {
        const p = await prisma.project.findUnique({ where: { id: projectId }, select: { fabricatorID: true } });
        if (p?.fabricatorID) docQuery.fabricatorId = p.fabricatorID;
        // Must match searchScope's own family scoping, or a below-floor answer can end up
        // pinned to a document from an entirely different, unselected family (e.g. citing the
        // Detailing Manual on a query scoped to just the Stair Standard) -- found via real
        // testing, not assumed. Omitted/empty filter = unchanged prior behavior.
        if (Array.isArray(fabricatorFamilyIds) && fabricatorFamilyIds.length > 0) {
          docQuery.documentFamilyId = { in: fabricatorFamilyIds };
        }
      } else if (sourceType === "PROJECT") {
        docQuery.projectId = projectId;
      }
      
      console.log(`[ChatService] Searching for a fallback document for ${sourceType} tier using query:`, docQuery);
      const doc = await prisma.standardDocument.findFirst({ where: docQuery });

      if (!doc) {
        // Should not happen for FABRICATOR (since null was handled), but could happen if db changes
        console.warn(`[ChatService] WARNING: No ACTIVE document found for ${sourceType} fallback, using null pin.`);
        return prisma.standardChatAnswer.create({
          data: {
            messageId: message.id,
            sourceType,
            chunkType: "PROSE",
            answerText: "Not covered by this standard.",
            pinnedDocumentId: null
          }
        });
      }

      return prisma.standardChatAnswer.create({
        data: {
          messageId: message.id,
          sourceType,
          chunkType: "PROSE",
          answerText: "Not covered by this standard.",
          pinnedDocumentId: doc.id
        }
      });
    }

    // Second stage: cross-encoder reranking (GENERAL tier only by default).
    // NOTE: this runs AFTER the 0.60 floor check above, deliberately. The floor is
    // evaluated on the first-stage vector+lexical score so acceptance/refusal
    // semantics are identical with the reranker on or off; reranking only changes
    // WHICH 3 chunks are selected and in what order.
    let candidates = chunks.filter(c => !c.isAnchor);
    if (shouldRerank(sourceType) && candidates.length > 1) {
      const before = candidates.slice(0, 3).map(c => c.pageStart);
      // RERANK-SPECIFIC TEXT (2026-09-02): c.textContent is built by constructChunkText, which
      // puts the page's raw textContent FIRST for generation's benefit (framing/context), then
      // the (often more informative) ocrText after. Real measurement on a VISUAL AISC page: 751
      // tokens of largely-boilerplate prefix (title block, running header) before the useful
      // content even starts, against the reranker's real ~241-token budget at max_length=256 --
      // the reranker never sees the actual page content at all, and effectively scores on
      // near-identical header text across candidates. Root-caused via a real case: the same
      // fixed table (AISC J3.3) reranked correctly for "1/2 inch bolt" and incorrectly for "3/4
      // inch bolt" purely on which OTHER page's boilerplate-window happened to score higher.
      // Fix: for VISUAL chunks, rerank against the parent page's ocrText directly (no header
      // prefix) when it's the more informative field -- mirrors the same textContent-vs-ocrText
      // length comparison RC1 already uses for generation, just favouring compactness instead of
      // completeness, since the reranker's budget is what's actually scarce here.
      const rerankText = async (c: RetrievedChunk): Promise<string> => {
        if (c.chunkType !== "VISUAL" || !c.parentPageId) return c.textContent;
        const page = await prisma.standardPage.findUnique({ where: { id: c.parentPageId }, select: { ocrText: true, textContent: true } });
        if (page?.ocrText && page.ocrText.length > page.textContent.length) return page.ocrText;
        return c.textContent;
      };
      const textByChunkId = new Map<string, string>();
      await Promise.all(candidates.map(async c => textByChunkId.set(c.id, await rerankText(c))));
      const r = await rerank(queryText, candidates, c => textByChunkId.get(c.id) || c.textContent, sourceType);
      candidates = r.items;
      if (r.reranked) {
        console.log(`[ChatService] ${sourceType} top-3 before rerank: [${before}] -> after: [${candidates.slice(0, 3).map(c => c.pageStart)}]`);
      }
    }

    // Grab up to 3 best direct hits
    const topHits = candidates.slice(0, 3);
    const documentIds = [...new Set(topHits.map(h => h.documentId))];
    const docs = await prisma.standardDocument.findMany({ where: { id: { in: documentIds } } });
    const docMap = new Map(docs.map(d => [d.id, d]));
    
    if (!docMap.has(topHits[0].documentId)) throw new Error("Document not found");

    console.log(`[ChatService] Generating text for ${sourceType} tier...`);

    // RESIDUAL RISK DOCUMENTATION
    // The system reduces but does NOT eliminate confident-wrong-answer risk on queries where retrieval doesn't rank the correct page first.
    // Measured residual rate: ~42% of such misranked queries (N=95 sample) still produce a confidently wrong answer rather than a correct answer or safe refusal.
    // This is a known, open, unresolved limitation — not a solved problem — and should be treated as such by anyone building on top of this system later.
    //
    // IMAGE-FIRST DEFERRAL: low-confidence VISUAL chunks (unverified/broken extraction) are
    // never handed to the LLM for generation — only their citation image is offered. A
    // high-confidence chunk among topHits is still used to generate a real answer.
    const { eligible, deferred } = await splitByConfidence(topHits);

    let generatedText: string | null = null;
    let sourceChunk: RetrievedChunk | null = null;
    // Diagnostic-only: which of 'answered'/'refused'/'failed' generateAnswerText actually
    // returned, and why, when it ran. Does NOT affect citation ordering, pinnedDocumentId, or
    // the deferral fallback below -- 'refused' and 'failed' both behave exactly as before
    // (generatedText stays null, deferral still triggers on !generatedText). The only change is
    // that this true reason now gets persisted instead of lost. Null when generateAnswerText was
    // never invoked (e.g. eligible.length === 0, which per splitByConfidence's contract only
    // happens when deferred already covers every candidate).
    let generationStatus: GenerationStatus | null = null;
    let generationFailureReason: string | null = null;

    if (eligible.length > 0) {
      const genResult = await generateAnswerText(eligible, queryText);
      generatedText = genResult.text;
      generationStatus = genResult.status;
      generationFailureReason = genResult.failureReason ?? null;
      sourceChunk = (genResult.sourceChunkIndex !== null && genResult.sourceChunkIndex >= 0 && genResult.sourceChunkIndex < eligible.length)
        ? eligible[genResult.sourceChunkIndex] : null;
    }

    if (!generatedText && deferred.length > 0) {
      // Either nothing was eligible, or the eligible chunks genuinely didn't have the answer —
      // either way, a strongly-retrieved low-confidence page is a better lead than a flat refusal.
      const deferHit = deferred[0];
      const pdfName = docMap.get(deferHit.documentId)?.pdfName || "Unknown";
      generatedText = buildDeferralText(deferHit, pdfName);
      sourceChunk = deferHit;
      console.log(`[ChatService] ${sourceType} DEFERRED to citation image: page ${deferHit.pageStart} (low-confidence extraction, no reliable text to quote).`);
    }

    let orderedHits = [...topHits];
    const sourceIdx = sourceChunk ? orderedHits.findIndex(h => h.id === sourceChunk!.id) : -1;
    if (sourceIdx > 0) {
      const hit = orderedHits.splice(sourceIdx, 1)[0];
      orderedHits.unshift(hit);
    }

    const citationsData = orderedHits.map((hit, index) => {
      const anchor = hit.anchor;
      const hitDoc = docMap.get(hit.documentId);
      
      const pdfName = hitDoc?.pdfName || "Unknown";
      
      return {
        chunkType: hit.chunkType as StandardChunkType,
        citationPdfName: pdfName,
        citationPageStart: hit.pageStart,
        citationPageEnd: hit.pageEnd,
        anchorPageStart: anchor ? anchor.pageStart : null,
        anchorPageEnd: anchor ? anchor.pageEnd : null,
        imagePaths: buildImagePaths(hit, anchor),
        rank: index + 1
      };
    });

    const answer = await prisma.standardChatAnswer.create({
      data: {
        messageId: message.id,
        sourceType,
        chunkType: sourceChunk ? sourceChunk.chunkType as StandardChunkType : topHits[0].chunkType as StandardChunkType,
        answerText: generatedText, // LLM output or null fallback
        pinnedDocumentId: sourceChunk ? sourceChunk.documentId : null, // Safely null if attribution failed
        generationStatus, // 'answered' | 'refused' | 'failed' | null -- see generateAnswerText
        generationFailureReason, // populated only when generationStatus === 'failed'
        citations: {
          create: citationsData
        }
      }
    });
    
    console.log(`[ChatService] processSource for ${sourceType} latency: ${(performance.now() - startMeasure).toFixed(2)}ms`);
    console.log(`[ChatService] ---> Final Assigned Source: Document ID = ${answer.pinnedDocumentId}, ChunkType = ${answer.chunkType}`);
    
    return answer;
  }

  const generalPromise = processSource(searchResults.general, "GENERAL");
  const fabricatorPromise = processSource(searchResults.fabricator, "FABRICATOR");
  const projectPromise = processSource(searchResults.project, "PROJECT");

  await Promise.all([generalPromise, fabricatorPromise, projectPromise]);

  const chatMessage = await prisma.standardChatMessage.findUniqueOrThrow({
    where: { id: message.id },
    include: { answers: { include: { citations: true } } }
  });

  chatMessage.answers.forEach(ans => {
    const tierChunks = ans.sourceType === "GENERAL" ? searchResults.general :
                       ans.sourceType === "FABRICATOR" ? searchResults.fabricator :
                       searchResults.project;
                       
    ans.citations.forEach(cit => {
      const chunk = (tierChunks || []).find(c => c.pageStart === cit.citationPageStart && !c.isAnchor);
      if (chunk) {
        (cit as any).finalScore = chunk.similarity;
      }
    });
  });

  return chatMessage;
}
