import { Request, Response } from "express";
import prisma from "../../../config/database/client";
import { standardsIngestionQueue } from "../jobs/standardsIngestion";
import { StandardSourceType } from "@prisma/client";
import { askStandards } from "../services/chatService";

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

      if (sourceType === "PROJECT") {
        if (isOmitted(fabricatorId) || isOmitted(projectId)) {
          res.status(400).json({ message: "fabricatorId and projectId are required for PROJECT sourceType" });
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

      res.status(200).json(result);
    } catch (error: any) {
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
