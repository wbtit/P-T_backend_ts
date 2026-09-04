import prisma from "../../../config/database/client";

export interface SearchStandardsOptions {
  query: string;
  projectId: string;
  threshold?: number; // candidate floor (default 0.45)
  alpha?: number;
  acceptanceThreshold?: number; // final threshold (default 0.60)
  /** How many pooled candidates to return per tier (default 10).
   *  Widened to feed the cross-encoder reranker — see rerankerService.ts. */
  topK?: number;
  /** FABRICATOR tier only. Scopes the candidate pool to these document_family_id values
   *  (e.g. a fabricator with both a Detailing Manual and a Stair Standard). Omitted or empty
   *  means "no family selected" -- pools ALL of the fabricator's ACTIVE documents, same as
   *  before this filter existed. Deliberately NOT the same convention as GENERAL/PROJECT's
   *  "zero preferences = zero results": a project's fabricator assignment is already a scoping
   *  decision, so no family choice reasonably means "everything my fabricator has," and this
   *  keeps any caller that predates the family selector working unchanged. See
   *  tests/KNOWN_ISSUES.md ("FABRICATOR tier had no family scoping"). */
  fabricatorFamilyIds?: string[];
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  chunkType: string;
  pageStart: number;
  pageEnd: number;
  textContent: string;
  sourceType: string;
  similarity: number; // Final score
  vectorSimilarity: number;
  lexicalScore: number;
  isAnchor?: boolean;
  /** Anchor chunk expanded from this hit via shared heading. Undefined for anchor rows themselves. */
  anchor?: RetrievedChunk;
  parentPageId?: string;
  heading?: string;
}

export interface SearchStandardsResponse {
  general: RetrievedChunk[] | null;
  fabricator: RetrievedChunk[] | null;
  project: RetrievedChunk[] | null;
}

import { standardAbbreviations } from "../../../utils/abbreviations";

const STOPWORDS = new Set([
  "what", "is", "the", "of", "are", "should", "i", "use", "for", "how", "do", "a", "an", "to", "in", "on", "at", "by", "and", "or"
]);

function tokenizeAndNormalize(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const rawTokens = lower.match(/[a-z0-9\/]+/g) || [];
  const tokens: string[] = [];
  for (const t of rawTokens) {
    if (STOPWORDS.has(t)) continue;
    const expanded = Object.prototype.hasOwnProperty.call(standardAbbreviations, t) ? standardAbbreviations[t] : t;
    if (expanded.includes(" ")) {
      tokens.push(...expanded.split(" "));
    } else {
      tokens.push(expanded);
    }
  }
  return tokens;
}

function calculateLexicalScore(queryTokens: string[], chunkText: string): number {
  if (queryTokens.length === 0) return 0;
  const chunkTokens = new Set(tokenizeAndNormalize(chunkText));
  let overlap = 0;
  for (const qt of queryTokens) {
    if (chunkTokens.has(qt)) overlap++;
  }
  return overlap / queryTokens.length;
}

const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

export async function generateEmbedding(text: string): Promise<number[]> {
  // NOTE: Ollama's /api/embeddings ignores the num_ctx option for nomic-embed-text. The model remains strictly capped at 2048 tokens.
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text })
  });
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }
  const data = (await response.json()) as { embedding: number[] };
  if (!data.embedding || data.embedding.length === 0) {
    throw new Error(`Empty embedding received from Ollama API`);
  }
  return data.embedding;
}

export async function searchScope(
  embedding: number[],
  scopeCondition: string,
  options: SearchStandardsOptions
): Promise<RetrievedChunk[] | null> {
  const { query, projectId, threshold = 0.45, alpha = 0.0, acceptanceThreshold = 0.60, topK = 10, fabricatorFamilyIds } = options;
  const vectorString = `[${embedding.join(",")}]`;
  const queryTokens = tokenizeAndNormalize(query);
  
  // Basic threshold + top-K search
  let querySql = `
    SELECT 
      c.id, 
      c.document_id as "documentId",
      c.chunk_type as "chunkType",
      c.page_start as "pageStart",
      c.page_end as "pageEnd",
      c.text_content as "textContent",
      c.source_type as "sourceType",
      c.heading,
      c.parent_page_id as "parentPageId",
      1 - (c.embedding <=> $1::vector) AS similarity
    FROM standard_chunks c
  `;

  let results: any[];
  if (scopeCondition === "GENERAL" || scopeCondition === "PROJECT") {
    if (!projectId) {
      return [];
    }

    const prefs = await prisma.projectStandardPreference.findMany({
      where: { 
        projectId,
        sourceType: scopeCondition
      },
      select: { standardFamilyId: true }
    });
    const preferredFamilyIds = prefs.map(p => p.standardFamilyId);

    // Short-circuit: if the project has zero preferences, it gets zero results.
    if (preferredFamilyIds.length === 0) {
      console.log(`[RetrievalService] scopeCondition '${scopeCondition}' short-circuiting: 0 preferences selected for project.`);
      return null;
    }

    querySql += `
      JOIN standard_documents d ON c.document_id = d.id
      WHERE c.source_type = $4::"StandardSourceType" AND d.status = 'ACTIVE' AND d.document_family_id = ANY($3::text[])
      AND 1 - (c.embedding <=> $1::vector) > $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT 40
    `;
    console.log(`[RetrievalService] Executing vector search for '${scopeCondition}' against families:`, preferredFamilyIds);
    results = await prisma.$queryRawUnsafe(querySql, vectorString, threshold, preferredFamilyIds, scopeCondition);
  } else if (scopeCondition === "FABRICATOR") {
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { fabricatorID: true }
    });
    
    if (!proj || !proj.fabricatorID) {
      console.log(`[RetrievalService] scopeCondition 'FABRICATOR' short-circuiting: Project has no fabricator ID.`);
      return null;
    }

    const hasFamilyFilter = Array.isArray(fabricatorFamilyIds) && fabricatorFamilyIds.length > 0;

    // Check if fabricator has any ACTIVE FABRICATOR-tier document -- scoped to the selected
    // families, if any, so this short-circuit reflects what will actually be searched rather
    // than "does this fabricator have ANY document at all" (which could be true while the
    // specifically-selected family has none).
    const activeDoc = await prisma.standardDocument.findFirst({
      where: {
        fabricatorId: proj.fabricatorID,
        sourceType: "FABRICATOR",
        status: "ACTIVE",
        ...(hasFamilyFilter ? { documentFamilyId: { in: fabricatorFamilyIds } } : {})
      }
    });

    if (!activeDoc) {
      console.log(`[RetrievalService] scopeCondition 'FABRICATOR' short-circuiting: Fabricator ${proj.fabricatorID} has no ACTIVE documents${hasFamilyFilter ? ` in families [${fabricatorFamilyIds!.join(", ")}]` : ""}.`);
      return null; // Distinct "not applicable" state
    }

    querySql += `
      JOIN standard_documents d ON c.document_id = d.id
      WHERE c.source_type = $4::"StandardSourceType" AND c.fabricator_id = $2::uuid AND d.status = 'ACTIVE'
      AND 1 - (c.embedding <=> $1::vector) > $3
      ${hasFamilyFilter ? "AND d.document_family_id = ANY($5::text[])" : ""}
      ORDER BY c.embedding <=> $1::vector
      LIMIT 40
    `;
    console.log(`[RetrievalService] Executing vector search for 'FABRICATOR' against fabricatorId: ${proj.fabricatorID}` + (hasFamilyFilter ? `, families: ${JSON.stringify(fabricatorFamilyIds)}` : " (no family filter -- pooling all)"));
    results = hasFamilyFilter
      ? await prisma.$queryRawUnsafe(querySql, vectorString, proj.fabricatorID, threshold, scopeCondition, fabricatorFamilyIds)
      : await prisma.$queryRawUnsafe(querySql, vectorString, proj.fabricatorID, threshold, scopeCondition);
  } else {
    // Unsupported scope
    return [];
  }

  // Map of chunk id -> anchor chunk (expanded from shared heading).
  // Built during the loop below, then attached after the sort.
  const anchorByHitId = new Map<string, RetrievedChunk>();
  const processedAnchorHeadings = new Set<string>();

  const allHits: RetrievedChunk[] = [];

  for (const row of results) {
    const lexicalScore = calculateLexicalScore(queryTokens, row.textContent);
    const finalScore = row.similarity + (alpha * lexicalScore);

    const chunk: RetrievedChunk = {
      id: row.id,
      documentId: row.documentId,
      chunkType: row.chunkType,
      pageStart: row.pageStart,
      pageEnd: row.pageEnd,
      textContent: row.textContent,
      sourceType: row.sourceType,
      vectorSimilarity: row.similarity,
      lexicalScore,
      similarity: finalScore,
      parentPageId: row.parentPageId,
      heading: row.heading
    };
    allHits.push(chunk);
  }

  // Max-pool finalScore by parentPageId
  const pooledMap = new Map<string, RetrievedChunk>();
  for (const hit of allHits) {
    const groupKey = hit.parentPageId || hit.id;
    const existing = pooledMap.get(groupKey);
    if (!existing || hit.similarity > existing.similarity) {
      pooledMap.set(groupKey, hit);
    }
  }

  const directHits: RetrievedChunk[] = [];
  for (const chunk of pooledMap.values()) {
    // Apply final acceptance threshold — 0.0 when caller wants all and applies floor itself
    if (chunk.similarity > acceptanceThreshold) {
      directHits.push(chunk);

      // Expand VISUAL chunks ONLY if the direct hit clears the threshold.
      // The anchor is identified by shared heading within the same document (Phase 5 definition).
      // Anchors can be many pages away from the hit (Phase 6 observation) — proximity is not used.
      if (chunk.chunkType === "VISUAL" && chunk.heading) {
        const anchorKey = `${chunk.documentId}-${chunk.heading}`;
        if (!processedAnchorHeadings.has(anchorKey)) {
          processedAnchorHeadings.add(anchorKey);
          
          // Find VISUAL chunks under this heading in this document, ordered by page
          const anchorResult = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
              id, 
              document_id as "documentId",
              chunk_type as "chunkType",
              page_start as "pageStart",
              page_end as "pageEnd",
              text_content as "textContent",
              source_type as "sourceType",
              heading,
              1 - (embedding <=> $1::vector) AS similarity
            FROM standard_chunks
            WHERE document_id = $2::uuid 
              AND heading = $3
              AND chunk_type = 'VISUAL'
            ORDER BY page_start ASC
          `, vectorString, chunk.documentId, chunk.heading);

          if (anchorResult.length > 0) {
            let anchorRow = anchorResult[0];
            
            if (anchorResult.length > 1) {
              // Skip title/intro pages where the heading is repeated verbatim in the body content
              const trueAnchor = anchorResult.find(c => {
                if (!c.heading) return true;
                const occurrences = c.textContent.split(c.heading).length - 1;
                return occurrences < 2;
              });
              if (trueAnchor) {
                anchorRow = trueAnchor;
              }
            }
            
            // Only attach if the anchor is a different chunk from the hit itself
            if (anchorRow.id !== chunk.id) {
              const anchorChunk: RetrievedChunk = {
                id: anchorRow.id,
                documentId: anchorRow.documentId,
                chunkType: anchorRow.chunkType,
                pageStart: anchorRow.pageStart,
                pageEnd: anchorRow.pageEnd,
                textContent: anchorRow.textContent,
                sourceType: anchorRow.sourceType,
                vectorSimilarity: anchorRow.similarity,
                lexicalScore: 0,
                similarity: anchorRow.similarity, // Exempt from hybrid filter, raw score kept
                isAnchor: true
              };
              // Record the explicit hit → anchor linkage by the hit's id
              anchorByHitId.set(chunk.id, anchorChunk);
            }
          }
        }
      }
    }
  }

  // Sort direct hits by hybrid score descending
  directHits.sort((a, b) => b.similarity - a.similarity);

  // Attach the explicit anchor onto each direct hit that has one
  for (const hit of directHits) {
    const anchor = anchorByHitId.get(hit.id);
    if (anchor) {
      hit.anchor = anchor;
    }
  }

  return directHits.slice(0, topK);
}

export async function searchStandards(options: SearchStandardsOptions): Promise<SearchStandardsResponse> {
  const { query, projectId } = options;
  const queryEmbedding = await generateEmbedding(query);

  const [general, fabricator, project] = await Promise.all([
    searchScope(queryEmbedding, "GENERAL", options),
    searchScope(queryEmbedding, "FABRICATOR", options),
    searchScope(queryEmbedding, "PROJECT", options)
  ]);

  return { general, fabricator, project };
}
