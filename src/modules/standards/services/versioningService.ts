import prisma from "../../../config/database/client";

export interface ActivationResult {
  /** True only when this call actually changed anything -- false for the
   *  already-ACTIVE no-op case (Phase 6's caller needs to tell these apart). */
  activated: boolean;
  supersededCount: number;
}

export class StandardsVersioningService {
  public async activateStandardDocument(documentId: string): Promise<ActivationResult> {
    // NOTE: This atomic swap's correctness relies structurally on the fact that
    // chunkingWorker executes with `concurrency: 1`. If chunking concurrent jobs
    // ever scales up, this transaction will require explicit row-level locking
    // (e.g. pg_advisory_xact_lock) to prevent parallel uploads from creating a race condition.
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

      // Determine scope
      const whereClause: any = {
        status: "ACTIVE",
        sourceType: newDoc.sourceType,
        documentFamilyId: newDoc.documentFamilyId
      };

      if (newDoc.sourceType === "FABRICATOR") {
        whereClause.fabricatorId = newDoc.fabricatorId;
        whereClause.projectId = null;
      } else if (newDoc.sourceType === "GENERAL") {
        whereClause.fabricatorId = null;
        whereClause.projectId = null;
      }

      // Supersede all existing active docs in scope
      const superseded = await tx.standardDocument.updateMany({
        where: whereClause,
        data: { status: "SUPERSEDED" }
      });

      // Activate the new doc
      await tx.standardDocument.update({
        where: { id: documentId },
        data: {
          status: "ACTIVE",
          processingStage: null
        }
      });

      return { activated: true, supersededCount: superseded.count };
    });
  }
}
