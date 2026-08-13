import prisma from "../../../config/database/client";

export interface SearchStandardsOptions {
  query: string;
  projectId: string;
  threshold?: number; // candidate floor (default 0.45)
  alpha?: number;
  acceptanceThreshold?: number; // final threshold (default 0.60)
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
}

export interface SearchStandardsResponse {
  general: RetrievedChunk[];
  fabricator: RetrievedChunk[];
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

async function searchScope(
  embedding: number[],
  scopeCondition: string,
  options: SearchStandardsOptions
): Promise<RetrievedChunk[]> {
  const { query, projectId, threshold = 0.45, alpha = 0.0, acceptanceThreshold = 0.60 } = options;
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
      1 - (c.embedding <=> $1::vector) AS similarity
    FROM standard_chunks c
  `;

  let results: any[];
  if (scopeCondition === "GENERAL") {
    querySql += `
      JOIN standard_documents d ON c.document_id = d.id
      WHERE c.source_type = 'GENERAL' AND d.status = 'ACTIVE'
      AND 1 - (c.embedding <=> $1::vector) > $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT 10
    `;
    results = await prisma.$queryRawUnsafe(querySql, vectorString, threshold);
  } else {
    querySql += `
      JOIN standard_documents d ON c.document_id = d.id
      WHERE c.source_type = 'FABRICATOR' AND c.project_id = $2::uuid AND d.status = 'ACTIVE'
      AND 1 - (c.embedding <=> $1::vector) > $3
      ORDER BY c.embedding <=> $1::vector
      LIMIT 10
    `;
    results = await prisma.$queryRawUnsafe(querySql, vectorString, projectId, threshold);
  }

  // Map of chunk id -> anchor chunk (expanded from shared heading).
  // Built during the loop below, then attached after the sort.
  const anchorByHitId = new Map<string, RetrievedChunk>();
  const processedAnchorHeadings = new Set<string>();

  const directHits: RetrievedChunk[] = [];

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
      similarity: finalScore
    };
    
    // Apply final acceptance threshold — 0.0 when caller wants all and applies floor itself
    if (finalScore > acceptanceThreshold) {
      directHits.push(chunk);

      // Expand VISUAL chunks ONLY if the direct hit clears the threshold.
      // The anchor is identified by shared heading within the same document (Phase 5 definition).
      // Anchors can be many pages away from the hit (Phase 6 observation) — proximity is not used.
      if (chunk.chunkType === "VISUAL" && row.heading) {
        const anchorKey = `${chunk.documentId}-${row.heading}`;
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
          `, vectorString, chunk.documentId, row.heading);

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

  return directHits;
}

export async function searchStandards(options: SearchStandardsOptions): Promise<SearchStandardsResponse> {
  const { query, projectId } = options;
  const queryEmbedding = await generateEmbedding(query);

  const [general, fabricator] = await Promise.all([
    searchScope(queryEmbedding, "GENERAL", options),
    searchScope(queryEmbedding, "FABRICATOR", options)
  ]);

  return { general, fabricator };
}
