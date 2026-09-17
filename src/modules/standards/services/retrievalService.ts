import prisma from "../../../config/database/client";

const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

export async function generateEmbedding(text: string): Promise<number[]> {
  // NOTE: Ollama's /api/embeddings ignores the num_ctx option for nomic-embed-text. The model remains strictly capped at 2048 tokens, and exceeding that cap hard-errors with a 500 ("the input length exceeds the context length") rather than truncating -- measured on Ollama 0.32.14, see Phase 2 spec Amendment 7.
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

/**
 * Phase 5 §1.3 -- resolves a project's associated document set, once, for the
 * two-branch retrieval path (`retrievalTwoBranch.ts`).
 *
 * Revised per the confirmed client pivot: PROJECT-tier scoping (a project
 * curating which families apply to it via `ProjectStandardPreference`) is
 * retired along with tier selection itself -- there is no per-project GENERAL
 * curation anymore, no `ProjectStandardPreference` involvement at all. Scope
 * is now exactly two auto-derived things, no user selection either:
 *   - GENERAL documents, org-wide: every ACTIVE GENERAL document, unfiltered,
 *     identical for every project (general standards are shared industry
 *     reference material, not a per-project selection).
 *   - FABRICATOR documents: this project's own fabricator's ACTIVE
 *     FABRICATOR documents, auto-derived from `Project.fabricatorID` --
 *     the one part of this that is genuinely project-specific, and the one
 *     real cross-project data-exposure risk (a fabricator's proprietary
 *     standards must never surface for a different fabricator's project).
 *
 * An empty result is no longer the common case it was under 3-tier scoping
 * (it now only happens if there are zero ACTIVE GENERAL documents at all,
 * which would be a real ingestion-side problem, not a normal per-project
 * state) -- every project sees at least the full GENERAL set.
 */
export async function resolveProjectDocumentIds(projectId: string): Promise<string[]> {
  const proj = await prisma.project.findUnique({
    where: { id: projectId },
    select: { fabricatorID: true },
  });

  const conditions: string[] = [`source_type = 'GENERAL'`];
  const params: any[] = [];
  let idx = 1;

  if (proj?.fabricatorID) {
    conditions.push(`(source_type = 'FABRICATOR' AND fabricator_id = $${idx}::uuid)`);
    params.push(proj.fabricatorID);
    idx++;
  }

  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id FROM standard_documents WHERE status = 'ACTIVE' AND (${conditions.join(" OR ")})`,
    ...params
  );
  return rows.map((r) => r.id);
}

// Phase 5 §1: the old 3-tier retrieval path (searchScope/searchStandards,
// RetrievedChunk, SearchStandardsOptions/Response, tokenizeAndNormalize/
// calculateLexicalScore's lexical blend, and the per-heading VISUAL
// anchor-expansion query) is removed here, not left dead -- chatService.ts's
// askStandards() now calls retrieveTwoBranch()/resolveProjectDocumentIds()
// exclusively, confirmed by grep before deletion (nothing else called
// searchStandards). Anchor-expansion specifically is not ported: its purpose
// was giving a low-value hit a nearby real page to point to, which Phase 5
// §2's hard deferral already does directly (points at the flagged chunk's
// own page image) -- see Phase 5 spec §1.5.
