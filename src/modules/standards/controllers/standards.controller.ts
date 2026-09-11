import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import prisma from "../../../config/database/client";
import { standardsIngestionQueue } from "../jobs/standardsIngestion";
import { documentIngestionQueue } from "../jobs/documentIngestion";
import { StandardSourceType } from "@prisma/client";
import { askStandards } from "../services/chatService";
import { StandardsVersioningService } from "../services/versioningService";
import {
  ensureDocumentDirs,
  sourcePdfPath,
  pagesDir,
  manifestWorkDir,
} from "../services/documentStorage";

export class StandardsController {
  public async uploadStandard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }
      
      const { sourceType, projectId, fabricatorId, documentFamilyId, isDefault, familyCode, edition } = req.body;
      if (!sourceType || !Object.values(StandardSourceType).includes(sourceType as any)) {
        res.status(400).json({ message: "Invalid or missing sourceType" });
        return;
      }

      const isOmitted = (val: any) => !val || val === "null" || val === "undefined" || (typeof val === "string" && val.trim() === "");

      if (isOmitted(documentFamilyId)) {
        res.status(400).json({ message: "documentFamilyId is required for all uploads" });
        return;
      }

      if (sourceType === "FABRICATOR") {
        if (isOmitted(fabricatorId) || !isOmitted(projectId)) {
          res.status(400).json({ message: "fabricatorId is required and projectId must be omitted for FABRICATOR sourceType" });
          return;
        }
      }

      if (!isOmitted(documentFamilyId)) {
        if (isOmitted(familyCode) || isOmitted(edition)) {
          res.status(400).json({ message: "familyCode and edition are required when providing documentFamilyId" });
          return;
        }

        const familyIsDefault = !isOmitted(isDefault) ? (isDefault === "true" || isDefault === true) : false;
        await prisma.standardFamily.upsert({
          where: { id: documentFamilyId },
          update: {
            // Ignore familyCode/edition on update so it stays immutable
            isDefault: isOmitted(isDefault) ? undefined : familyIsDefault
          },
          create: {
            id: documentFamilyId,
            familyCode,
            edition,
            isDefault: familyIsDefault
          }
        });
      }

      const storagePath = req.file.path; // Path where multer saved it
      const originalName = req.file.originalname;

      // Create new standard document as PENDING
      const document = await prisma.standardDocument.create({
        data: {
          sourceType: sourceType as StandardSourceType,
          projectId: isOmitted(projectId) ? null : projectId,
          fabricatorId: isOmitted(fabricatorId) ? null : fabricatorId,
          documentFamilyId: isOmitted(documentFamilyId) ? null : documentFamilyId,
          pdfName: originalName,
          storagePath: storagePath,
          status: "PENDING"
        }
      });

      // Enqueue job
      try {
        await standardsIngestionQueue.add("ingest", { documentId: document.id });
      } catch (enqueueErr) {
        console.error(`[StandardsController] Failed to enqueue document ${document.id}:`, enqueueErr);
        await prisma.standardDocument.update({
          where: { id: document.id },
          data: { status: "FAILED" }
        });
        throw enqueueErr;
      }

      res.status(201).json({ message: "Upload started", documentId: document.id });
    } catch (error: any) {
      console.error("[StandardsController] upload error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // ---------------------------------------------------------------------
  // Phase 6: the real endpoints, wired only to the tested Phase 2-5
  // pipeline. `uploadStandard` above (and the legacy queue it enqueues to)
  // is an old-RAG leftover, held only until these are verified, then removed.
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
      await ensureDocumentDirs(sourceType, document.id, resolvedFabricatorId);
      const destPdfPath = sourcePdfPath(sourceType, document.id, resolvedFabricatorId);
      await fs.promises.rename(req.file.path, destPdfPath);

      await prisma.standardDocument.update({
        where: { id: document.id },
        data: { storagePath: destPdfPath },
      });

      try {
        await documentIngestionQueue.add("ingest", {
          documentId: document.id,
          pdfPath: destPdfPath,
          manifestDir: manifestWorkDir(sourceType, document.id, resolvedFabricatorId),
          imageDir: pagesDir(sourceType, document.id, resolvedFabricatorId),
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
   *  own return value, not a separately-queried, race-prone guess. */
  public async activateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
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
      const result = await versioningService.activateStandardDocument(id);

      res.status(200).json({
        documentId: id,
        activated: result.activated,
        supersededCount: result.supersededCount,
        status: result.activated ? "ACTIVE" : doc.status,
      });
    } catch (error: any) {
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

  /** New STATUS endpoint -- same fields `getDocumentProgress` already
   *  exposed, plus `ingestReport` (Phase 6's new column: the full
   *  IngestReport once a run completes, dry-run or commit). This is the
   *  endpoint UPLOAD's caller polls. */
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

  public async getDocumentProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const document = await prisma.standardDocument.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          processingStage: true,
          pagesProcessed: true,
          totalPages: true,
          failureReason: true
        }
      });

      if (!document) {
        res.status(404).json({ message: "Document not found" });
        return;
      }

      res.status(200).json(document);
    } catch (error: any) {
      console.error("[StandardsController] getDocumentProgress error:", error);
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

  public async chat(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { query } = req.body;

      console.log(`\n\n[ChatController] --- NEW CHAT REQUEST ---`);
      console.log(`[ChatController] ProjectId: ${projectId}`);
      console.log(`[ChatController] Query: "${query}"`);

      if (!query || typeof query !== "string" || query.trim() === "") {
        console.log(`[ChatController] Rejected: empty query`);
        res.status(400).json({ message: "Query string is required" });
        return;
      }

      console.log(`[ChatController] Passing query to askStandards...`);
      const result = await askStandards(projectId, query);
      
      console.log(`[ChatController] Received result from askStandards!`);
      // Optional: uncomment below to print the full json
      // console.log(`[ChatController] Result JSON:`, JSON.stringify(result, null, 2));

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === "NO_PREFERENCES_SET") {
        res.status(200).json({ status: "no_preferences_set", message: "No standard preferences set for this project." });
        return;
      }
      console.error("[StandardsController] chat error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

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

      // Dual-format read path: 
      // If a StandardChatAnswer lacks a citations array (or it is empty) but has citationPdfName,
      // synthesize a citation object to match the Phase 11 structure for clients.
      const mappedHistory = history.map(msg => ({
        ...msg,
        answers: msg.answers.map(ans => {
          if (ans.citations && ans.citations.length > 0) {
            return ans; // New format
          }
          if (ans.citationPdfName) {
            // Legacy format fallback
            return {
              ...ans,
              citations: [{
                rank: 1,
                chunkType: ans.chunkType,
                citationPdfName: ans.citationPdfName,
                citationPageStart: ans.citationPageStart,
                citationPageEnd: ans.citationPageEnd,
                anchorPageStart: ans.anchorPageStart,
                anchorPageEnd: ans.anchorPageEnd,
                imagePaths: ans.imagePaths || [],
              }]
            };
          }
          // Fallback for empty answers (e.g., "Not covered")
          return { ...ans, citations: [] };
        })
      }));

      res.status(200).json(mappedHistory);
    } catch (error: any) {
      console.error("[StandardsController] getChatHistory error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  public async getStandardImage(req: Request, res: Response): Promise<void> {
    try {
      const { documentId, pageNumber } = req.params;
      
      const page = await prisma.standardPage.findFirst({
        where: {
          documentId,
          pageNumber: parseInt(pageNumber, 10)
        }
      });

      if (!page || !page.imagePath) {
        res.status(404).json({ message: "Image not found for this page." });
        return;
      }

      // page.imagePath is like "/uploads/standards/FABRICATOR/docId/pages/page-01.png"
      const absolutePath = require("path").resolve(process.cwd(), page.imagePath.replace(/^\//, ""));

      if (require("fs").existsSync(absolutePath)) {
        res.sendFile(absolutePath);
      } else {
        res.status(404).json({ message: "Image file not found on disk." });
      }
    } catch (error: any) {
      console.error("[StandardsController] getStandardImage error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
