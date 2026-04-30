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

    const files = row.files || [];

    const fileObj = files.find((f: FileObj) => f.id === fileId);

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
    console.error("[downloadShare] Incoming token:", token);

    const share = await prisma.fileShareLink.findUnique({
      where: { token },
    });
    console.error("[downloadShare] Share row:", share);

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
    console.error("[downloadShare] Parent row found:", {
      parentTable: share.parentTable,
      parentId: share.parentId,
      hasFiles: Array.isArray(row?.files),
      filesCount: Array.isArray(row?.files) ? row.files.length : 0,
    });

    if (!row) return res.status(404).json({ message: "Parent record not found" });

    const file = (row.files || []).find((f: FileObj) => f.id === share.fileId);
    console.error("[downloadShare] Matched file object:", file);
    if (!file) return res.status(404).json({ message: "File not found in record" });

    const filePath = resolveUploadFilePath(file);
    console.error("[downloadShare] Resolved file path:", {
      uploadBaseDir: UPLOAD_BASE_DIR,
      requestedFileId: share.fileId,
      storedPath: file.path,
      storedFilename: file.filename,
      resolvedPath: filePath,
    });

    if (!filePath) {
      console.error("[downloadShare] File missing on server after resolution:", {
        uploadBaseDir: UPLOAD_BASE_DIR,
        file,
      });
      return res.status(404).json({ message: "File missing on server" });
    }

    const stat = fs.statSync(filePath);
    const mimeType = mime.getType(filePath) || "application/octet-stream";
    console.error("[downloadShare] Streaming file:", {
      filePath,
      size: stat.size,
      mimeType,
      originalName: file.originalName,
    });

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

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error reading file" });
      }
    });

    stream.pipe(res);

  } catch (err) {
    console.error("Share Download Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export { createShareLink, downloadShare };
