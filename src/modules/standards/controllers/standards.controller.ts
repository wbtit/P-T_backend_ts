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
      
      const { sourceType, projectId, fabricatorId } = req.body;
      if (!sourceType || !Object.values(StandardSourceType).includes(sourceType as any)) {
        res.status(400).json({ message: "Invalid or missing sourceType" });
        return;
      }

      if (sourceType === "FABRICATOR") {
        if (!projectId || !fabricatorId) {
          res.status(400).json({ message: "projectId and fabricatorId are required for FABRICATOR sourceType" });
          return;
        }
      }

      const storagePath = req.file.path; // Path where multer saved it
      const originalName = req.file.originalname;

      // Create new standard document as PENDING
      const document = await prisma.standardDocument.create({
        data: {
          sourceType: sourceType as StandardSourceType,
          projectId: projectId || null,
          fabricatorId: fabricatorId || null,
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

  public async chat(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { query } = req.body;

      if (!query || typeof query !== "string" || query.trim() === "") {
        res.status(400).json({ message: "Query string is required" });
        return;
      }

      const result = await askStandards(projectId, query);
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
          answers: true
        }
      });

      res.status(200).json(history);
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
