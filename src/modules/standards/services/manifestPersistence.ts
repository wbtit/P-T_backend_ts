/**
 * Phase 2 build item 3/4 — persistence for manifest-derived chunks.
 *
 * Takes the DraftChunks produced by manifestChunking and writes them, plus the
 * per-page extraction status and per-document heading provenance.
 *
 * Two things this module does NOT do:
 *   - It does not generate embeddings. The job owns that, as it does today; a
 *     localId -> vector map is passed in.
 *   - It does not chunk. manifestChunking is a pure transformation and stays
 *     testable without a database.
 *
 * Why raw INSERT rather than createMany: `embedding` is
 * Unsupported("vector(768)") in the Prisma schema, and createMany cannot write
 * an Unsupported column. The existing chunking job already inserts chunks with
 * tagged-template $executeRaw inside a transaction, batched at 50; this matches
 * that pattern rather than inventing a second one. Tagged templates are
 * parameterised, so values are never interpolated into SQL text.
 *
 * REQUIRES the Phase 2 additive migration (prisma/phase2_draft) to have been
 * applied. Until then the new columns do not exist and these statements fail.
 */
import { v4 as uuidv4 } from "uuid";
import prisma from "../../../config/database/client";
import { EMBED_CHAR_BUDGET, requiresEmbedding } from "./manifestChunking";
import type { ChunkedDocument, DraftChunk } from "./manifestChunking";

export const BATCH_SIZE = 50;

/** Prisma's default interactive-transaction timeout is 5s, which is not enough
 *  for a document of any size. Expansion_Anchor (56 chunks) and
 *  completeconnectiondetails (168) finish well inside this; a full AISC ingest
 *  will not, and is expected to move to per-batch transactions rather than one
 *  transaction for the document. See the note at the bottom of this file. */
const TRANSACTION_TIMEOUT_MS = 120_000;
const TRANSACTION_MAX_WAIT_MS = 10_000;

export interface PersistOptions {
  documentId: string;
  sourceType: "GENERAL" | "FABRICATOR" | "PROJECT";
  projectId?: string | null;
  fabricatorId?: string | null;
  /** localId -> embedding vector. Produced by the job, not here. */
  embeddings: Map<string, number[]>;
  /** Per-document heading provenance, from the extractor's _summary.json. */
  headingMeta?: {
    noHeadingsDetected?: boolean | null;
    headingCoverageRatio?: number | null;
    outlineCoverageRatio?: number | null;
    outlineFillEnabled?: boolean | null;
  };
}

export interface PersistResult {
  deletedChunks: number;
  insertedParents: number;
  insertedChildren: number;
  updatedPages: number;
}

function vectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/**
 * Idempotency: DELETE the document's chunks, then insert.
 *
 * Chosen over an upsert key because a chunk has no natural stable identity.
 * Text content repeats legitimately across pages (shared headers, boilerplate),
 * and the only candidate composite — (document, page, type, rowGroupIndex) — is
 * not unique for a page carrying two tables, so making it a key would need both
 * a new discriminator column and a unique index beyond the drafted migration.
 * Re-ingest semantics are "replace this document's chunks" regardless, so
 * delete-then-insert says exactly that.
 *
 * TRANSACTION BOUNDARY: one per batch of 50, NOT one for the document.
 *
 * An earlier version wrapped the delete and every insert in a single
 * transaction. That is fine for a 15-page document and wrong for AISC's 2,325:
 * it holds locks on standard_chunks for minutes and dies on any timeout.
 *
 * What replaces it relies on a gate that already exists rather than a new one:
 * `retrievalService` joins standard_documents and filters `d.status = 'ACTIVE'`
 * on every scope branch, so a document that is not ACTIVE contributes nothing
 * to retrieval. The ingest therefore drops the document to PENDING first, and
 * only an explicit, opt-in activation puts it back.
 *
 * FAILURE SEMANTICS, which is the point of the design:
 *   - Die anywhere mid-insert and the document stays PENDING, so every one of
 *     its chunks is EXCLUDED from retrieval. Partial data is GATED, never
 *     served. It is absent, not wrong.
 *   - `pages_processed` records how far it got.
 *   - Re-running is safe: the delete clears whatever partial state exists.
 *   - Callers may set status FAILED; the enum already carries it.
 *
 * Known limits, stated rather than hidden:
 *   - The gate is in the query layer, not the database. Anything querying
 *     standard_chunks WITHOUT joining standard_documents would see partial
 *     rows. Today only retrievalService and the legacy chunking.ts do.
 *   - Re-ingesting an already-ACTIVE document makes it unavailable for the
 *     duration. Zero-downtime needs a version-swap (an `ingest_id` column plus
 *     a retrieval filter) — deferred until Phase 4 retrieval exists.
 */
export async function persistChunks(
  chunked: ChunkedDocument,
  opts: PersistOptions
): Promise<PersistResult> {
  const { documentId, sourceType, embeddings } = opts;
  const projectId = opts.projectId ?? null;
  const fabricatorId = opts.fabricatorId ?? null;

  // Assign real UUIDs up front so a child knows its parent's id before either
  // row is written. The existing job lets Postgres generate ids with
  // gen_random_uuid(), which cannot work here -- the parent id has to exist in
  // application memory to be written into the child's parent_chunk_id.
  const idByLocal = new Map<string, string>();
  for (const c of chunked.chunks) idByLocal.set(c.localId, uuidv4());

  const parents = chunked.chunks.filter((c) => c.parentLocalId === null);
  const children = chunked.chunks.filter((c) => c.parentLocalId !== null);

  // Invariants checked before anything is written, rather than half-way
  // through. These stand in for the CHECK constraints that were left out of the
  // migration: Prisma cannot express a CHECK, so one would exist live while
  // being absent from schema.prisma -- the drift class this project just fixed.
  // Enforcing here keeps the database and the schema file in agreement.
  const seenRowGroup = new Set<string>();
  for (const c of children) {
    const parentUuid = idByLocal.get(c.parentLocalId as string);
    if (!parentUuid) {
      throw new Error(
        `chunk ${c.localId} references unknown parent ${c.parentLocalId}; refusing to write a dangling parent_chunk_id`
      );
    }
    // would-be CHECK: parent_chunk_id <> id
    if (parentUuid === idByLocal.get(c.localId)) {
      throw new Error(`chunk ${c.localId} is its own parent`);
    }
    // would-be CHECK: row_group_index only on a child
    if (c.rowGroupIndex === null || c.rowGroupIndex === undefined) {
      throw new Error(`child chunk ${c.localId} has no rowGroupIndex`);
    }
    // matches the UNIQUE(parent_chunk_id, row_group_index) index
    const key = `${c.parentLocalId}#${c.rowGroupIndex}`;
    if (seenRowGroup.has(key)) {
      throw new Error(`duplicate row group ${key}`);
    }
    seenRowGroup.add(key);
  }
  for (const c of parents) {
    // would-be CHECK: row_group_index only on a child
    if (c.rowGroupIndex !== null) {
      throw new Error(
        `parent chunk ${c.localId} carries rowGroupIndex ${c.rowGroupIndex}; only children may`
      );
    }
  }
  // An embedding must be present for everything that needs one, and absent for
  // EXTRACTED table parents. Catching a missing embedding here beats
  // discovering a silently unretrievable chunk later.
  for (const c of chunked.chunks) {
    const has = embeddings.has(c.localId);
    if (requiresEmbedding(c) && !has) {
      throw new Error(`chunk ${c.localId} (${c.chunkType}) requires an embedding but none was supplied`);
    }
    if (!requiresEmbedding(c) && has) {
      throw new Error(
        `chunk ${c.localId} is an EXTRACTED table parent and must not be embedded; it ranks via max-pooled children`
      );
    }
  }

  const result: PersistResult = {
    deletedChunks: 0,
    insertedParents: 0,
    insertedChildren: 0,
    updatedPages: 0,
  };

  const insert = async (tx: any, c: DraftChunk) => {
    const id = idByLocal.get(c.localId)!;
    const parentId = c.parentLocalId ? idByLocal.get(c.parentLocalId)! : null;
    const vec = embeddings.get(c.localId);
    const vectorString = vec ? vectorLiteral(vec) : null;
    await tx.$executeRaw`
      INSERT INTO standard_chunks (
        id, document_id, chunk_type, page_start, page_end, text_content,
        source_type, project_id, fabricator_id, heading,
        document_family_id, edition, parent_chunk_id, row_group_index,
        reliability_reason, embedding, created_at
      ) VALUES (
        ${id}::uuid,
        ${documentId}::uuid,
        ${c.chunkType}::"StandardChunkType",
        ${c.pageStart},
        ${c.pageEnd},
        ${c.textContent},
        ${sourceType}::"StandardSourceType",
        ${projectId}::uuid,
        ${fabricatorId}::uuid,
        ${c.heading},
        ${c.documentFamilyId},
        ${c.edition},
        ${parentId}::uuid,
        ${c.rowGroupIndex},
        ${c.reliabilityReason}::"ChunkReliabilityReason",
        ${vectorString}::vector,
        NOW()
      )
    `;
  };

  // Step 1: drop out of ACTIVE before touching anything. From here until an
  // explicit activation, retrieval cannot see this document at all.
  await prisma.standardDocument.update({
    where: { id: documentId },
    data: { status: "PENDING" },
  });

  // Step 2: clear prior chunks. One statement, its own implicit transaction.
  const deleted: number = await prisma.$executeRaw`
    DELETE FROM standard_chunks WHERE document_id = ${documentId}::uuid
  `;
  result.deletedChunks = Number(deleted) || 0;

  // Step 3: insert in batches, each its own transaction. Parents in full
  // BEFORE any child, because the child carries the FK -- ordering is the
  // guarantee, there is no deferred constraint here.
  const insertBatched = async (rows: DraftChunk[], onDone: (n: number) => void) => {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        async (tx: any) => {
          for (const c of batch) await insert(tx, c);
        },
        { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS }
      );
      onDone(batch.length);
    }
  };
  await insertBatched(parents, (n) => (result.insertedParents += n));
  await insertBatched(children, (n) => (result.insertedChildren += n));

  // Step 4 (activation) is deliberately NOT here. Putting a document into
  // service is an explicit act -- see activateIngestedDocument below.
  return result;
}

/**
 * Create or update the document's pages from its manifests.
 *
 * standard_pages is empty and nothing else creates rows in it, so this both
 * inserts and carries the structural outcome. Upsert on the existing
 * (document_id, page_number) unique key, so re-running an ingest updates rows
 * rather than duplicating them -- a different idempotency strategy to the
 * chunks' delete-then-insert, because pages have a natural stable key and
 * chunks do not.
 *
 * image_path is NOT NULL and showing the page image IS the visual-only product
 * behaviour, so a manifest without one is an error rather than a null write.
 *
 * high_confidence_extraction is deliberately never written -- it is legacy and
 * frozen; extraction_status + visual_only_reason is the signal.
 */
export async function persistPages(
  chunked: ChunkedDocument,
  documentId: string
): Promise<number> {
  const missing = chunked.pages.filter((p) => !p.imagePath);
  if (missing.length) {
    throw new Error(
      `${missing.length} page(s) have no imagePath (first: page ${missing[0].pageNumber}). ` +
        `image_path is NOT NULL and the page image is the visual-only fallback; ` +
        `re-run extraction without --no-render-pages.`
    );
  }

  let written = 0;
  for (let i = 0; i < chunked.pages.length; i += BATCH_SIZE) {
    const batch = chunked.pages.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      async (tx: any) => {
        for (const p of batch) {
          // text_content is NOT NULL; a scanned page has no text layer, so its
          // OCR text stands in. Both are kept separately below.
          const textContent = p.proseText || p.ocrText || "";
          const n: number = await tx.$executeRaw`
            INSERT INTO standard_pages (
              id, document_id, page_number, image_path, text_content, ocr_text,
              extraction_status, visual_only_reason, heading_source, created_at
            ) VALUES (
              gen_random_uuid(), ${documentId}::uuid, ${p.pageNumber},
              ${p.imagePath}, ${textContent}, ${p.ocrText || null},
              ${p.extractionStatus}::"ExtractionStatus",
              ${p.visualOnlyReason}::"VisualOnlyReason",
              ${p.headingSource}::"HeadingSource",
              NOW()
            )
            ON CONFLICT (document_id, page_number) DO UPDATE SET
              image_path         = EXCLUDED.image_path,
              text_content       = EXCLUDED.text_content,
              ocr_text           = EXCLUDED.ocr_text,
              extraction_status  = EXCLUDED.extraction_status,
              visual_only_reason = EXCLUDED.visual_only_reason,
              heading_source     = EXCLUDED.heading_source
          `;
          written += Number(n) || 0;
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS }
    );
  }
  return written;
}

/**
 * Report chunks over the embed budget, so the count is visible before the
 * ingest starts rather than only in per-chunk logs during it.
 *
 * Over budget does NOT mean the embedding is lost: the ingest truncates for the
 * embedding request and stores `text_content` complete. It also does not mean
 * the request would have failed silently -- Ollama returns a 500 for an
 * over-long input, it does not truncate (see spec amendment 7).
 */
export function reportEmbedTruncationRisk(
  chunked: ChunkedDocument,
  budget: number = EMBED_CHAR_BUDGET
): { localId: string; chunkType: string; page: number; length: number }[] {
  const over = chunked.chunks
    .filter((c) => requiresEmbedding(c) && c.textContent.length > budget)
    .map((c) => ({
      localId: c.localId,
      chunkType: c.chunkType,
      page: c.pageStart,
      length: c.textContent.length,
    }));
  for (const o of over) {
    console.warn(
      `[embed-over-budget] document=${chunked.documentId} page=${o.page} ` +
        `chunkType=${o.chunkType} chars=${o.length} budget=${budget} ` +
        `-- will be truncated for the embedding request; stored text stays complete`
    );
  }
  return over;
}

/**
 * Step 4 of the ingest, deliberately separate and opt-in.
 *
 * Nothing in the ingest path calls this. A document only becomes visible to
 * retrieval when someone decides it should be, which is why a half-finished
 * ingest is harmless: it simply never reaches this call.
 *
 * This does NOT supersede prior editions the way
 * StandardsVersioningService.activateStandardDocument does -- that belongs to
 * the tier/versioning path the pivot removes. This only flips one document.
 */
export async function activateIngestedDocument(documentId: string): Promise<void> {
  await prisma.standardDocument.update({
    where: { id: documentId },
    data: { status: "ACTIVE" },
  });
}

/** Per-document heading provenance, so a bad heading run is queryable rather
 *  than only visible in a log. */
export async function persistHeadingMeta(
  documentId: string,
  meta: NonNullable<PersistOptions["headingMeta"]>
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE standard_documents
       SET no_headings_detected   = ${meta.noHeadingsDetected ?? null},
           heading_coverage_ratio = ${meta.headingCoverageRatio ?? null},
           outline_coverage_ratio = ${meta.outlineCoverageRatio ?? null},
           outline_fill_enabled   = ${meta.outlineFillEnabled ?? null}
     WHERE id = ${documentId}::uuid
  `;
}

/**
 * Scaling note, deliberately not solved here.
 *
 * persistChunks wraps the whole document in one transaction so the delete and
 * the inserts succeed or fail together. That is right for the two exit-criterion
 * documents (Expansion_Anchor ~56 chunks, completeconnectiondetails ~168) and
 * wrong for a full AISC ingest, which will produce chunks in the tens of
 * thousands and exceed any sane transaction window.
 *
 * The fix when that day comes is a version-swap, not a longer timeout: insert
 * the new chunk set alongside the old under a new version marker, then flip the
 * document over in one small transaction -- which is what
 * StandardsVersioningService.activateStandardDocument already does for
 * documents. Raising the timeout instead would hold locks on standard_chunks
 * for minutes during a bulk ingest.
 */
