import prisma from "../../../config/database/client";

export interface SearchStandardsOptions {
  query: string;
  projectId: string;
  threshold?: number;
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  chunkType: string;
  pageStart: number;
  pageEnd: number;
  textContent: string;
  sourceType: string;
  similarity: number;
  isAnchor?: boolean;
}

export interface SearchStandardsResponse {
  general: RetrievedChunk[];
  fabricator: RetrievedChunk[];
}

const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text })
  });
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }
  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}

async function searchScope(
  embedding: number[], 
  scopeCondition: string, 
  threshold: number, 
  projectId?: string
): Promise<RetrievedChunk[]> {
  const vectorString = `[${embedding.join(",")}]`;
  
  // Basic threshold + top-K search
  let query = `
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
    query += `
      JOIN standard_documents d ON c.document_id = d.id
      WHERE c.source_type = 'GENERAL' AND d.status = 'ACTIVE'
      AND 1 - (c.embedding <=> $1::vector) > $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT 10
    `;
    results = await prisma.$queryRawUnsafe(query, vectorString, threshold);
  } else {
    query += `
      JOIN standard_documents d ON c.document_id = d.id
      WHERE c.source_type = 'FABRICATOR' AND c.project_id = $2::uuid AND d.status = 'ACTIVE'
      AND 1 - (c.embedding <=> $1::vector) > $3
      ORDER BY c.embedding <=> $1::vector
      LIMIT 10
    `;
    results = await prisma.$queryRawUnsafe(query, vectorString, projectId, threshold);
  }

  const finalChunks: RetrievedChunk[] = [];
  const processedAnchorHeadings = new Set<string>();

  for (const row of results) {
    const chunk: RetrievedChunk = {
      id: row.id,
      documentId: row.documentId,
      chunkType: row.chunkType,
      pageStart: row.pageStart,
      pageEnd: row.pageEnd,
      textContent: row.textContent,
      sourceType: row.sourceType,
      similarity: row.similarity
    };
    finalChunks.push(chunk);

    // Expand VISUAL chunks
    if (chunk.chunkType === "VISUAL" && row.heading) {
      const anchorKey = `${chunk.documentId}-${row.heading}`;
      if (!processedAnchorHeadings.has(anchorKey)) {
        processedAnchorHeadings.add(anchorKey);
        
        // Find the VISUAL chunks under this heading in this document
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
            // Skip title/intro pages where the heading is repeated in the body content.
            // The context preamble injects the heading once. If it appears >= 2 times, it's a title page.
            const trueAnchor = anchorResult.find(c => {
              if (!c.heading) return true;
              const occurrences = c.textContent.split(c.heading).length - 1;
              return occurrences < 2;
            });
            if (trueAnchor) {
              anchorRow = trueAnchor;
            }
          }
          
          // Deduplicate if the anchor is the direct hit itself
          if (anchorRow.id !== chunk.id) {
            finalChunks.push({
              id: anchorRow.id,
              documentId: anchorRow.documentId,
              chunkType: anchorRow.chunkType,
              pageStart: anchorRow.pageStart,
              pageEnd: anchorRow.pageEnd,
              textContent: anchorRow.textContent,
              sourceType: anchorRow.sourceType,
              similarity: anchorRow.similarity,
              isAnchor: true
            });
          }
        }
      }
    }
  }

  return finalChunks;
}

export async function searchStandards(options: SearchStandardsOptions): Promise<SearchStandardsResponse> {
  const { query, projectId, threshold = 0.5 } = options;
  const queryEmbedding = await generateEmbedding(query);

  const [general, fabricator] = await Promise.all([
    searchScope(queryEmbedding, "GENERAL", threshold),
    searchScope(queryEmbedding, "FABRICATOR", threshold, projectId)
  ]);

  return { general, fabricator };
}
