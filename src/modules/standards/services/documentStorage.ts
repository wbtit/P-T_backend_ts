import path from "path";
import fs from "fs";

/**
 * Phase 6 -- storage convention, decided:
 *   uploads/standards/<general|fabricator>/[<fabricator_name_slug>/]<document_id>/source.pdf
 *   uploads/standards/<general|fabricator>/[<fabricator_name_slug>/]<document_id>/pages/*.png
 *
 * One folder per document (source + all rendered page images co-located),
 * split first by source_type, fabricator-scoped documents get a sub-folder
 * named after the fabricator's real name (sanitized -- see
 * `slugifyFabricatorName()`), not its UUID -- for human traceability when
 * browsing the disk directly. Was `<fabricator_id>` originally; changed to
 * the real name once FABRICATOR-tier uploads were real enough for that to
 * matter for someone browsing the disk by hand. Filename is document_id-based,
 * never the original filename -- avoids collisions and the special-character
 * path issues already seen this session (see Phase 2/3b ingest reports).
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

/** Storage-path folder segment for a fabricator, from its real name --
 *  `uploads/standards/fabricator/<slug>/<documentId>/...` instead of the
 *  fabricator's UUID, for human traceability when browsing the disk
 *  directly. The caller looks up the real `Fabricator.fabName` (this module
 *  has no DB access, deliberately -- pure path math); this function only
 *  sanitizes whatever real name it's given.
 *
 *  Even though the client is expected to send a real, already-validated
 *  fabricatorId (so `fabName` is real, human-entered text, not attacker
 *  input), path construction still must not depend on that assumption --
 *  this project already hit a real bug from an unescaped special character
 *  in a path this session ("Joist & Hilti"). Real fabricator names seen in
 *  this corpus ("Cobb Industrial, Inc.", "RAY STEEL") confirm commas,
 *  periods, and mixed case are real, not hypothetical.
 *
 *  lowercase -> strip anything that isn't [a-z0-9 -] -> spaces to hyphens ->
 *  collapse repeated hyphens -> trim leading/trailing hyphens. Falls back to
 *  the raw fabricatorId (not silently to an empty string, and not a fabricated
 *  name) only in the degenerate case where the real name has zero
 *  alphanumeric characters at all -- not observed in this corpus, but a real
 *  possible input the function must not produce an empty/invalid path for. */
export function slugifyFabricatorName(fabName: string, fallbackFabricatorId: string): string {
  const slug = fabName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : fallbackFabricatorId;
}

/** Absolute path to this document's folder. Throws if FABRICATOR and no
 *  fabricatorFolder is given -- the convention requires it, not an omission.
 *  `fabricatorFolder` is the already-sanitized folder segment (see
 *  `slugifyFabricatorName()`), not a raw fabricatorId -- the caller resolves
 *  and sanitizes the fabricator's real name before calling any function here. */
export function documentDir(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorFolder?: string | null
): string {
  const parts = [UPLOADS_ROOT, sourceTypeFolder(sourceType)];
  if (sourceType === "FABRICATOR") {
    if (!fabricatorFolder) {
      throw new Error("documentDir: fabricatorFolder is required for FABRICATOR sourceType");
    }
    parts.push(fabricatorFolder);
  }
  parts.push(documentId);
  return path.join(...parts);
}

export function sourcePdfPath(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorFolder?: string | null
): string {
  return path.join(documentDir(sourceType, documentId, fabricatorFolder), "source.pdf");
}

export function pagesDir(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorFolder?: string | null
): string {
  return path.join(documentDir(sourceType, documentId, fabricatorFolder), "pages");
}

/** Transient extractor working directory (manifests, extract.log) -- see the
 *  module docstring for why this is colocated but not part of the decided
 *  serving structure. */
export function manifestWorkDir(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorFolder?: string | null
): string {
  return path.join(documentDir(sourceType, documentId, fabricatorFolder), "manifest");
}

/** Creates the document's folder (and pages/ subfolder) if absent. Called
 *  once at upload time, before the extractor runs. */
export async function ensureDocumentDirs(
  sourceType: StorageSourceType,
  documentId: string,
  fabricatorFolder?: string | null
): Promise<void> {
  await fs.promises.mkdir(pagesDir(sourceType, documentId, fabricatorFolder), { recursive: true });
  await fs.promises.mkdir(manifestWorkDir(sourceType, documentId, fabricatorFolder), { recursive: true });
}
