import crypto from "crypto";
import prisma from "../config/database/client";
import mime from "mime";
import fs from "fs";
import { Request, Response } from "express";
import { resolveUploadFilePath, UPLOAD_BASE_DIR } from "./fileUtil";




interface FileObj {
  id: string;
  path: string;
  filename?: string;
  originalName: string;
}

// maps API table names to prisma model names
const MODEL_MAP: Record<string, string> = {
  notes: "notes",
  project: "project",
  meeting:"meeting",
  fabricator:"fabricator",
  designDrawings:"designDrawings",
  designDrawingsResponses:"designDrawingsResponses",
  submittalVersion:"submittalVersion",
  submittalsResponse:"submittalsResponse",
  rFI:"rFI",
  rFIResponse:"rFIResponse",
  rFQ:"rFQ",
  CDAttachments:"rFQ",
  rFQResponse:"rFQResponse",
  changeOrder:"changeOrder",
  changeOrders:"changeOrder",
  cOResponse:"cOResponse",
  estimation:"estimation",
  connectionDesignerQuota: "connectionDesignerQuota",
  estimationResponse:"estimationResponse",
  estimationresponse:"estimationResponse",
  teamMeetingNotes:"teamMeetingNotes",
  teamMeetingNotesResponse:"teamMeetingNotesResponse",
  projectProgressReport: "projectProgressReport",
  projectProgressReportResponse: "projectProgressReportResponse",
  projectprogressreport: "projectProgressReport",
  projectprogressreportresponse: "projectProgressReportResponse",
  coordinationDrawing: "coordinationDrawing",
  coordinationDrawingResponse: "coordinationDrawingResponse",
  coordinationdrawing: "coordinationDrawing",
  coordinationdrawingresponse: "coordinationDrawingResponse",
};

const createShareLink = async (req: Request, res: Response) => {
  try {
    const { table, parentId, fileId } = req.params;

    const modelName = MODEL_MAP[table];
    if (!modelName) {
      return res.status(400).json({ message: "Invalid table" });
    }

    const model = (prisma as Record<string, any>)[modelName];
    if (!model || typeof model.findUnique !== "function") {
      return res.status(400).json({ message: "Unsupported table model" });
    }

    // fetch parent row
    const row = await model.findUnique({
      where: { id: parentId }
    });

    if (!row) return res.status(404).json({ message: "Record not found" });

    let files: any[] = [];
    if (table === "CDAttachments") {
      files = (row.CDAttachments as any[]) || [];
    } else if (table === "rFQ") {
      files = [...((row.files as any[]) || []), ...((row.CDAttachments as any[]) || [])];
    } else {
      files = (row.files as any[]) || [];
    }

    console.log("[DEBUG createShareLink]", { table, parentId, fileId, filesCount: files.length });

    const fileObj = files.find((f: any) => f.id === fileId || f.filename === fileId); // Added fallback to filename

    if (!fileObj) {
      return res.status(404).json({ message: "File not found in JSON" });
    }

    const resolvedFilePath = resolveUploadFilePath(fileObj);
    if (!resolvedFilePath) {
      if (table === "designDrawings" || table === "designDrawingsResponses") {
        console.error("[createShareLink][designDrawings] File could not be resolved", {
          table,
          parentId,
          fileId,
          uploadBaseDir: UPLOAD_BASE_DIR,
          fileObj,
        });
      }

      return res.status(404).json({
        message: "File missing on server",
        details:
          table === "designDrawings" || table === "designDrawingsResponses"
            ? {
                table,
                parentId,
                fileId,
                uploadBaseDir: UPLOAD_BASE_DIR,
                storedPath: fileObj.path,
                storedFilename: fileObj.filename,
              }
            : undefined,
      });
    }

    if (table === "designDrawings" || table === "designDrawingsResponses") {
      console.error("[createShareLink][designDrawings] File resolved successfully", {
        table,
        parentId,
        fileId,
        uploadBaseDir: UPLOAD_BASE_DIR,
        storedPath: fileObj.path,
        storedFilename: fileObj.filename,
        resolvedFilePath,
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.fileShareLink.create({
      data: {
        token,
        parentTable: table,
        parentId,
        fileId,
      },
    });
    const shareUrl = `${process.env.APP_BASE_URL}/v1/share/${token}`;
    return res.status(201).json({
      message: "Share link created successfully",
      shareUrl,
    });
    
  } catch (err) {
    console.error("Create Share Link Error:", err);
    return res.status(500).json({
      message: "Something went wrong",
      error: (err as Error).message,
    });
  }
};


const downloadShare = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const share = await prisma.fileShareLink.findUnique({
      where: { token },
    });

    if (!share) return res.status(404).json({ message: "Invalid link" });

    const modelName = MODEL_MAP[share.parentTable];
    if (!modelName)
      return res.status(400).json({ message: "Invalid table in link" });

    const model = (prisma as Record<string, any>)[modelName];
    if (!model || typeof model.findUnique !== "function") {
      return res.status(400).json({ message: "Unsupported table model" });
    }

    const row = await model.findUnique({
      where: { id: share.parentId },
    });

    if (!row) return res.status(404).json({ message: "Parent record not found" });

    let files: any[] = [];
    if (share.parentTable === "CDAttachments") {
      files = (row.CDAttachments as any[]) || [];
    } else if (share.parentTable === "rFQ") {
      files = [...((row.files as any[]) || []), ...((row.CDAttachments as any[]) || [])];
    } else {
      files = (row.files as any[]) || [];
    }
    
    const file = files.find((f: any) => f.id === share.fileId || f.filename === share.fileId);
    if (!file) return res.status(404).json({ message: "File not found in record" });

    const filePath = resolveUploadFilePath(file);

    if (!filePath || !fs.existsSync(filePath)) {
      console.error("[downloadShare] File missing on server after resolution:", {
        uploadBaseDir: UPLOAD_BASE_DIR,
        file,
      });
      return res.status(404).json({ error: "File not found" });
    }

    const stat = fs.statSync(filePath);
    const mimeType = mime.getType(filePath) || "application/octet-stream";

    // IMPORTANT HEADERS
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName}"`
    );

    const stream = fs.createReadStream(filePath);

    req.on("close", () => {
      stream.destroy();
    });

    // Handle stream errors (disk read failure, NAS disconnect etc.)
    stream.on("error", (err) => {
      console.error("Stream error in shareLink:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "File could not be read" });
      }
    });

    stream.pipe(res);

  } catch (err) {
    console.error("Share Download Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export { createShareLink, downloadShare };
