import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import prisma from "../../../config/database/client";
import { documentIngestionQueue } from "../jobs/documentIngestion";
import { StandardSourceType } from "@prisma/client";
import { askStandards, reconstructHistoryEntry } from "../services/chatService";
import { StandardsVersioningService } from "../services/versioningService";
import {
  ensureDocumentDirs,
  sourcePdfPath,
  pagesDir,
  manifestWorkDir,
  slugifyFabricatorName,
} from "../services/documentStorage";

export class StandardsController {
  // ---------------------------------------------------------------------
  // Phase 6: the real endpoints, wired only to the tested Phase 2-5
  // pipeline. The old `uploadStandard` method (and the legacy
  // standardsIngestion/pageClassification/chunking worker chain it fed) was
  // removed once these were verified end to end -- confirmed via grep that
  // nothing else server-side enqueued to any of those three queues before
  // deleting the job files.
  // ---------------------------------------------------------------------

  /** Wraps `ingestDocument()` (manifestIngestion.ts) via the new
   *  `documentIngestionQueue` -- async, not synchronous: extraction alone
   *  measured up to ~68s for a 166-page document this session, and a
   *  2000+-page document is expected to take minutes, which no synchronous
   *  HTTP response should hold a connection open for. Returns immediately
   *  (202) with the document id; the caller polls `getDocumentStatus`. */
  public async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const { sourceType, fabricatorId, documentFamilyId, isDefault, familyCode, edition } = req.body;
      const commit = req.body.commit === "true" || req.body.commit === true;

      if (!sourceType || (sourceType !== "GENERAL" && sourceType !== "FABRICATOR")) {
        res.status(400).json({ message: "sourceType must be GENERAL or FABRICATOR" });
        return;
      }

      const isOmitted = (val: any) => !val || val === "null" || val === "undefined" || (typeof val === "string" && val.trim() === "");

      if (isOmitted(documentFamilyId)) {
        res.status(400).json({ message: "documentFamilyId is required" });
        return;
      }
      if (sourceType === "FABRICATOR" && isOmitted(fabricatorId)) {
        res.status(400).json({ message: "fabricatorId is required for FABRICATOR sourceType" });
        return;
      }
      if (isOmitted(familyCode) || isOmitted(edition)) {
        res.status(400).json({ message: "familyCode and edition are required when providing documentFamilyId" });
        return;
      }

      // Resolve the real fabricator name for the storage path (real name,
      // not the UUID -- for human traceability browsing the disk directly)
      // BEFORE creating anything, so a bad/stale fabricatorId fails cleanly
      // with a 400 naming the problem rather than creating a stray document
      // row or silently falling back to using the id as the folder name.
      let fabricatorFolder: string | null = null;
      if (sourceType === "FABRICATOR") {
        const fabricator = await prisma.fabricator.findUnique({
          where: { id: fabricatorId },
          select: { fabName: true },
        });
        if (!fabricator) {
          res.status(400).json({ message: `fabricatorId ${fabricatorId} does not match any real fabricator` });
          return;
        }
        // Sanitized for the path only -- the real, unsanitized fabName stays
        // in the database as-is, never overwritten.
        fabricatorFolder = slugifyFabricatorName(fabricator.fabName, fabricatorId);
      }

      const familyIsDefault = !isOmitted(isDefault) ? (isDefault === "true" || isDefault === true) : false;
      await prisma.standardFamily.upsert({
        where: { id: documentFamilyId },
        update: { isDefault: isOmitted(isDefault) ? undefined : familyIsDefault },
        create: { id: documentFamilyId, familyCode, edition, isDefault: familyIsDefault },
      });

      // Create the row first so its real id drives the storage paths --
      // avoids generating a UUID in application code when Prisma already
      // owns that responsibility everywhere else in this project.
      const document = await prisma.standardDocument.create({
        data: {
          sourceType: sourceType as StandardSourceType,
          fabricatorId: isOmitted(fabricatorId) ? null : fabricatorId,
          documentFamilyId,
          pdfName: req.file.originalname,
          storagePath: "", // set below, once the real destination is known
          status: "PENDING",
        },
      });

      const resolvedFabricatorId = isOmitted(fabricatorId) ? null : fabricatorId;
      await ensureDocumentDirs(sourceType, document.id, fabricatorFolder);
      const destPdfPath = sourcePdfPath(sourceType, document.id, fabricatorFolder);
      await fs.promises.rename(req.file.path, destPdfPath);

      await prisma.standardDocument.update({
        where: { id: document.id },
        data: { storagePath: destPdfPath },
      });

      try {
        await documentIngestionQueue.add("ingest", {
          documentId: document.id,
          pdfPath: destPdfPath,
          manifestDir: manifestWorkDir(sourceType, document.id, fabricatorFolder),
          imageDir: pagesDir(sourceType, document.id, fabricatorFolder),
          sourceType,
          fabricatorId: resolvedFabricatorId,
          documentFamilyId,
          edition,
          commit,
        });
      } catch (enqueueErr) {
        console.error(`[StandardsController] Failed to enqueue documentId ${document.id}:`, enqueueErr);
        await prisma.standardDocument.update({
          where: { id: document.id },
          data: { status: "FAILED", failureReason: "Failed to enqueue ingestion job" },
        });
        throw enqueueErr;
      }

      res.status(202).json({
        documentId: document.id,
        status: "PENDING",
        commit,
        message: "Ingestion queued. Poll GET /standards/documents/:id for progress.",
      });
    } catch (error: any) {
      console.error("[StandardsController] uploadDocument error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /** Wraps `activateStandardDocument()` -- adds the PENDING-only guard that
   *  function itself never enforced (it would activate from any non-ACTIVE
   *  status, including FAILED). Reports real row counts from the function's
   *  own return value, not a separately-queried, race-prone guess.
   *
   *  No longer auto-supersedes by family -- the caller must explicitly name
   *  `supersedesDocumentId` (request body) to replace one specific prior
   *  document (the legitimate case: re-ingesting the exact same source
   *  content to fix a bug). Omitted: activates, supersedes nothing, allowing
   *  multiple ACTIVE documents in the same family to coexist. */
  public async activateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { supersedesDocumentId } = req.body ?? {};
      const doc = await prisma.standardDocument.findUnique({ where: { id } });
      if (!doc) {
        res.status(404).json({ message: "Document not found" });
        return;
      }
      if (doc.status !== "PENDING") {
        res.status(409).json({
          message: `Cannot activate a document with status ${doc.status}. Only PENDING documents can be activated.`,
          status: doc.status,
        });
        return;
      }

      const versioningService = new StandardsVersioningService();
      const result = await versioningService.activateStandardDocument(
        id,
        typeof supersedesDocumentId === "string" && supersedesDocumentId.trim() !== "" ? supersedesDocumentId : undefined
      );

      res.status(200).json({
        documentId: id,
        activated: result.activated,
        supersededCount: result.supersededCount,
        status: result.activated ? "ACTIVE" : doc.status,
      });
    } catch (error: any) {
      if (error.message?.includes("supersedesDocumentId")) {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error("[StandardsController] activateDocument error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /** New LIST endpoint -- nothing before this listed documents by
   *  status/sourceType/family at all. */
  public async listDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { status, sourceType, documentFamilyId, fabricatorId } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (sourceType) where.sourceType = sourceType;
      if (documentFamilyId) where.documentFamilyId = documentFamilyId;
      if (fabricatorId) where.fabricatorId = fabricatorId;

      const documents = await prisma.standardDocument.findMany({
        where,
        select: {
          id: true,
          pdfName: true,
          sourceType: true,
          status: true,
          documentFamilyId: true,
          fabricatorId: true,
          totalPages: true,
          pagesProcessed: true,
          uploadedAt: true,
          documentFamily: { select: { familyCode: true, edition: true } },
        },
        orderBy: { uploadedAt: "desc" },
      });

      res.status(200).json({ documents });
    } catch (error: any) {
      console.error("[StandardsController] listDocuments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /** STATUS endpoint -- exposes `ingestReport` (Phase 6's column: the full
   *  IngestReport once a run completes, dry-run or commit) alongside the
   *  document's status fields. This is the endpoint UPLOAD's caller polls;
   *  the older, narrower `/documents/:id/progress` (a strict subset of this
   *  endpoint's fields, no `ingestReport`) was removed once this replaced it. */
  public async getDocumentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const document = await prisma.standardDocument.findUnique({
        where: { id },
        select: {
          id: true,
          pdfName: true,
          sourceType: true,
          status: true,
          processingStage: true,
          pagesProcessed: true,
          totalPages: true,
          failureReason: true,
          ingestReport: true,
          documentFamilyId: true,
          fabricatorId: true,
          uploadedAt: true,
        },
      });

      if (!document) {
        res.status(404).json({ message: "Document not found" });
        return;
      }

      res.status(200).json(document);
    } catch (error: any) {
      console.error("[StandardsController] getDocumentStatus error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /** New image endpoint -- same URL shape `chatService.ts`'s citation
   *  `imagePaths` already emit (`/v1/standards/image/:documentId/:pageNumber`),
   *  new implementation. The old `getStandardImage` assumed a repo-relative
   *  `/uploads/standards/...` path; real Phase 2 manifests store an absolute
   *  path (confirmed this session: `/tmp/...`, which is also volatile) --
   *  this serves whatever `image_path` actually contains, absolute or not,
   *  rather than re-deriving a path from convention, so it works regardless
   *  of which convention wrote it (including the new §storage one). */
  public async getPageImage(req: Request, res: Response): Promise<void> {
    try {
      const { documentId, pageNumber } = req.params;
      const page = await prisma.standardPage.findFirst({
        where: { documentId, pageNumber: parseInt(pageNumber, 10) },
      });

      if (!page || !page.imagePath) {
        res.status(404).json({ message: "Image not found for this page." });
        return;
      }

      const absolutePath = path.isAbsolute(page.imagePath)
        ? page.imagePath
        : path.resolve(process.cwd(), page.imagePath.replace(/^\//, ""));

      if (fs.existsSync(absolutePath)) {
        res.sendFile(absolutePath);
      } else {
        res.status(404).json({ message: "Image file not found on disk." });
      }
    } catch (error: any) {
      console.error("[StandardsController] getPageImage error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  public async getAvailableFamilies(req: Request, res: Response): Promise<void> {
    try {
      const tier = (req.query.tier as string);

      let families;

      if (!tier) {
        // Return all families if no tier provided
        families = await prisma.standardFamily.findMany();
      } else {
        if (tier !== "GENERAL") {
          res.status(400).json({ message: "Invalid tier. Must be GENERAL." });
          return;
        }

        // Return only families that have an ACTIVE GENERAL document.
        const activeDocs = await prisma.standardDocument.findMany({
          where: { sourceType: "GENERAL", status: "ACTIVE" },
          select: { documentFamilyId: true },
          distinct: ['documentFamilyId']
        });

        const familyIds = activeDocs
          .map(d => d.documentFamilyId)
          .filter((id): id is string => id !== null);

        families = await prisma.standardFamily.findMany({
          where: { id: { in: familyIds } }
        });
      }

      res.status(200).json({ families });
    } catch (error: any) {
      console.error("[StandardsController] getAvailableFamilies error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  public async getFabricatorFamilies(req: Request, res: Response): Promise<void> {
    try {
      const { fabricatorId } = req.params;

      if (!fabricatorId) {
        res.status(400).json({ message: "fabricatorId is required" });
        return;
      }

      const activeDocs = await prisma.standardDocument.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { sourceType: "GENERAL" },
            { 
              sourceType: "FABRICATOR",
              fabricatorId: fabricatorId 
            }
          ]
        },
        select: { documentFamilyId: true },
        distinct: ['documentFamilyId']
      });

      const familyIds = activeDocs
        .map(d => d.documentFamilyId)
        .filter((id): id is string => id !== null);

      const families = await prisma.standardFamily.findMany({
        where: { id: { in: familyIds } }
      });

      res.status(200).json({ families });
    } catch (error: any) {
      console.error("[StandardsController] getFabricatorFamilies error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /** Phase 6 QUERY -- the real, product-shaped endpoint (Google-style: an AI
   *  summary plus ranked candidate documents), wrapping the same
   *  `askStandards()` the pre-existing `/chat` route calls. `messageId` is
   *  included for a frontend that wants to link back into chat history
   *  (`GET .../chat/history`), not required to render the response itself. */
  public async query(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { query: queryText } = req.body;

      if (!queryText || typeof queryText !== "string" || queryText.trim() === "") {
        res.status(400).json({ message: "Query string is required" });
        return;
      }

      const result = await askStandards(projectId, queryText);

      res.status(200).json({
        messageId: result.message.id,
        aiSummary: result.aiSummary,
        deferralReason: result.deferralReason,
        results: result.results,
        queryRewritten: result.queryRewritten,
        effectiveQuery: result.effectiveQuery,
      });
    } catch (error: any) {
      console.error("[StandardsController] query error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /** Reshaped to match QUERY's live response shape (`aiSummary`/
   *  `deferralReason`/`results[]`) -- askStandards() (called only from QUERY
   *  now that `/chat` is removed) is the sole write path, so history should
   *  look like the thing that created it, not the old, now-gone `/chat`
   *  route's single-answer shape. This is a real, documented approximation
   *  of the live shape, not a replay of it -- see `reconstructHistoryEntry`'s
   *  own docstring in chatService.ts for exactly what can and can't be
   *  recovered from what's actually persisted. */
  public async getChatHistory(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      const history = await prisma.standardChatMessage.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: {
          answers: {
            include: { citations: true }
          }
        }
      });

      // Dual-format read path: if a StandardChatAnswer lacks a citations
      // array (or it's empty) but has citationPdfName set directly on it
      // (pre-Citation-table rows), synthesize a citation object so
      // reconstructHistoryEntry() has one consistent shape to work from.
      const normalizedAnswers = history.map((msg) =>
        msg.answers.map((ans) => {
          if (ans.citations && ans.citations.length > 0) return ans;
          if (ans.citationPdfName) {
            return {
              ...ans,
              citations: [{
                rank: 1,
                chunkType: ans.chunkType,
                citationPdfName: ans.citationPdfName,
                citationPageStart: ans.citationPageStart ?? 0,
                citationPageEnd: ans.citationPageEnd ?? 0,
                anchorPageStart: ans.anchorPageStart,
                anchorPageEnd: ans.anchorPageEnd,
                imagePaths: ans.imagePaths || [],
              }],
            };
          }
          return { ...ans, citations: [] };
        })
      );

      // Batch-recover documentId per citation (parsed from imagePaths, the
      // only place it's stored) across the whole history page, then one
      // query to fill in family/edition -- not one query per citation.
      const documentIds = new Set<string>();
      for (const answers of normalizedAnswers) {
        for (const ans of answers) {
          for (const cit of ans.citations) {
            const match = cit.imagePaths[0]?.match(/\/image\/([^/]+)\//);
            if (match) documentIds.add(match[1]);
          }
        }
      }
      const docs = documentIds.size
        ? await prisma.standardDocument.findMany({
            where: { id: { in: [...documentIds] } },
            select: { id: true, documentFamilyId: true, documentFamily: { select: { familyCode: true, edition: true } } },
          })
        : [];
      const familyByDocumentId = new Map(
        docs.map((d) => [d.id, { documentFamilyId: d.documentFamilyId, familyCode: d.documentFamily?.familyCode ?? null, edition: d.documentFamily?.edition ?? null }])
      );

      // Same treatment, one more batched lookup: hyperlinks/pageDescription
      // aren't stored on StandardChatCitation either -- one query across the
      // whole history page, keyed by (documentId, pageNumber), not one query
      // per citation.
      const pageKeys = new Set<string>();
      for (const answers of normalizedAnswers) {
        for (const ans of answers) {
          for (const cit of ans.citations) {
            const match = cit.imagePaths[0]?.match(/\/image\/([^/]+)\//);
            if (match) pageKeys.add(`${match[1]}:${cit.citationPageStart}`);
          }
        }
      }
      const pages = pageKeys.size
        ? await prisma.standardPage.findMany({
            where: {
              OR: [...pageKeys].map((key) => {
                const [documentId, pageNumberStr] = key.split(":");
                return { documentId, pageNumber: Number(pageNumberStr) };
              }),
            },
            select: { documentId: true, pageNumber: true, hyperlinks: true, pageDescription: true },
          })
        : [];
      const pageByDocumentIdAndPage = new Map(
        pages.map((p) => [
          `${p.documentId}:${p.pageNumber}`,
          { hyperlinks: (p.hyperlinks as { uri: string; text: string | null }[] | null) ?? null, pageDescription: p.pageDescription },
        ])
      );

      const mappedHistory = history.map((msg, i) => reconstructHistoryEntry(msg, normalizedAnswers[i], familyByDocumentId, pageByDocumentIdAndPage));

      res.status(200).json(mappedHistory);
    } catch (error: any) {
      console.error("[StandardsController] getChatHistory error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

}
