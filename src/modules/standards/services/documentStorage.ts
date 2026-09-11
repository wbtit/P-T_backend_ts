import path from "path";
import fs from "fs";

/**
 * Phase 6 -- storage convention, decided:
 *   uploads/standards/<general|fabricator>/[<fabricator_id>/]<document_id>/source.pdf
 *   uploads/standards/<general|fabricator>/[<fabricator_id>/]<document_id>/pages/*.png
 *
 * One folder per document (source + all rendered page images co-located),
 * split first by source_type, fabricator-scoped documents get a fabricator_id
 * sub-folder. Filename is document_id-based, never the original filename --
 * avoids collisions and the special-character path issues already seen this
 * session (see Phase 2/3b ingest reports).
 *
 * This directly fixes the confirmed-broken `/image` endpoint (Phase 6 spec
 * §1.1) as a side effect of building storage correctly, not as a patch to the
 * old logic: the old pipeline stored images under `/tmp/...` (this session's
 * own confirmed-volatile scratch location); this one is a stable, repo-local
 * directory that persists for the life of the document.
 *
 * Not part of the decided convention (it only specifies source.pdf and
 * pages/*.png): where the extractor's transient JSON manifests live. They are
 * read once during ingestion and never again -- no code re-reads a persisted
 * manifest after commit -- so they have no long-term serving requirement.
 * Colocated under the same per-document folder anyway (a `manifest/`
 * subfolder, name deliberately distinct from `pages/`) rather than a second,
 * separate location or `/tmp` again, purely for single-place cleanup/
 * traceability. Flagging this as a filled gap, not a silent addition to the
 * decided structure -- it doesn't contradict the spec, it answers the one
 * thing the spec didn't cover.
 */

export type StorageSourceType = "GENERAL" | "FABRICATOR";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads", "standards");

function sourceTypeFolder(sourceType: StorageSourceType): "general" | "fabricator" {
  return sourceType === "FABRICATOR" ? "fabricator" : "general";
}

/** Absolute path to this document's folder. Throws if FABRICATOR and no
 *  fabricatorId is given -- the convention requires it, not an omission. */
export function documentDir(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorId?: string | null
): string {
  const parts = [UPLOADS_ROOT, sourceTypeFolder(sourceType)];
  if (sourceType === "FABRICATOR") {
    if (!fabricatorId) {
      throw new Error("documentDir: fabricatorId is required for FABRICATOR sourceType");
    }
    parts.push(fabricatorId);
  }
  parts.push(documentId);
  return path.join(...parts);
}

export function sourcePdfPath(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorId?: string | null
): string {
  return path.join(documentDir(sourceType, documentId, fabricatorId), "source.pdf");
}

export function pagesDir(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorId?: string | null
): string {
  return path.join(documentDir(sourceType, documentId, fabricatorId), "pages");
}

/** Transient extractor working directory (manifests, extract.log) -- see the
 *  module docstring for why this is colocated but not part of the decided
 *  serving structure. */
export function manifestWorkDir(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorId?: string | null
): string {
  return path.join(documentDir(sourceType, documentId, fabricatorId), "manifest");
}

/** Creates the document's folder (and pages/ subfolder) if absent. Called
 *  once at upload time, before the extractor runs. */
export async function ensureDocumentDirs(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorId?: string | null
): Promise<void> {
  await fs.promises.mkdir(pagesDir(sourceType, documentId, fabricatorId), { recursive: true });
  await fs.promises.mkdir(manifestWorkDir(sourceType, documentId, fabricatorId), { recursive: true });
}
