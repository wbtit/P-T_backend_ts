import prisma from "../../../config/database/client";

export interface ActivationResult {
  /** True only when this call actually changed anything -- false for the
   *  already-ACTIVE no-op case (Phase 6's caller needs to tell these apart). */
  activated: boolean;
  supersededCount: number;
}

export class StandardsVersioningService {
  /**
   * No longer auto-supersedes by family. Confirmed real requirement (not
   * assumed): two genuinely different documents in the same
   * (sourceType, documentFamilyId, fabricatorId) scope -- different editions
   * of a manual, two distinct fabricator standards -- must coexist as
   * separate ACTIVE documents, always searchable, never silently hidden by
   * each other. The auto-supersession this function used to do conflated
   * that real case with the one legitimate reason to supersede: re-ingesting
   * the EXACT SAME source content (a bug fix, e.g. this session's own
   * AISC/SJI/ccd/Hilti image-path re-ingests) -- which is now the only thing
   * `supersedesDocumentId` does, and only when the caller names it
   * explicitly. Default behavior (no `supersedesDocumentId`): activate,
   * supersede nothing.
   *
   * NOTE: This atomic swap's correctness relies structurally on the fact that
   * chunkingWorker executes with `concurrency: 1`. If chunking concurrent jobs
   * ever scales up, this transaction will require explicit row-level locking
   * (e.g. pg_advisory_xact_lock) to prevent parallel uploads from creating a race condition.
   */
  public async activateStandardDocument(documentId: string, supersedesDocumentId?: string): Promise<ActivationResult> {
    return prisma.$transaction(async (tx) => {
      const newDoc = await tx.standardDocument.findUnique({
        where: { id: documentId }
      });
      if (!newDoc) {
        throw new Error(`Document ${documentId} not found`);
      }
      if (newDoc.status === "ACTIVE") {
        return { activated: false, supersededCount: 0 };
      }

      let supersededCount = 0;
      if (supersedesDocumentId) {
        const target = await tx.standardDocument.findUnique({
          where: { id: supersedesDocumentId },
        });
        if (!target) {
          throw new Error(`supersedesDocumentId ${supersedesDocumentId} not found`);
        }
        if (target.status !== "ACTIVE") {
          throw new Error(
            `supersedesDocumentId ${supersedesDocumentId} is not ACTIVE (status: ${target.status}) -- nothing to supersede`
          );
        }
        // Deliberate safety guard, beyond the literal ask: refuse to
        // supersede a document outside the activating document's own scope.
        // The whole point of this change is a caller naming ONE specific
        // prior document to replace, not an arbitrary cross-family override
        // -- silently allowing a scope mismatch would reopen the same class
        // of accidental-hiding bug this change exists to close, just moved
        // from automatic to caller error.
        const sameScope =
          target.sourceType === newDoc.sourceType &&
          target.documentFamilyId === newDoc.documentFamilyId &&
          target.fabricatorId === newDoc.fabricatorId;
        if (!sameScope) {
          throw new Error(
            `supersedesDocumentId ${supersedesDocumentId} is not in the same scope (sourceType/documentFamilyId/fabricatorId) as ${documentId} -- refusing to supersede across scopes`
          );
        }

        await tx.standardDocument.update({
          where: { id: supersedesDocumentId },
          data: { status: "SUPERSEDED" },
        });
        supersededCount = 1;
      }

      // Activate the new doc
      await tx.standardDocument.update({
        where: { id: documentId },
        data: {
          status: "ACTIVE",
          processingStage: null
        }
      });

      return { activated: true, supersededCount };
    });
  }
}
