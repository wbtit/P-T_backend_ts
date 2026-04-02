import crypto from "crypto";
import prisma from "../config/database/client";
import mime from "mime";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { UPLOAD_BASE_DIR } from "./fileUtil";




interface FileObj {
  id: string;
  path: string;
  filename?: string;
  originalName: string;
}

const resolveSharedFilePath = (file: FileObj) => {
  const baseDir = path.resolve(UPLOAD_BASE_DIR);
  const rawValues = [file.path, file.filename].filter(
    (value): value is string => Boolean(value)
  );

  const candidates = new Set<string>();

  for (const rawValue of rawValues) {
    const normalizedValue = rawValue.replace(/\\/g, "/");

    candidates.add(path.resolve(baseDir, normalizedValue));

    if (path.isAbsolute(normalizedValue)) {
      candidates.add(path.resolve(normalizedValue));
    }

    const trimmedValue = normalizedValue
      .replace(/^\/?public\//, "")
      .replace(/^\/?uploads\//, "")
      .replace(/^\/+/, "");

    candidates.add(path.resolve(baseDir, trimmedValue));
  }

  for (const candidate of candidates) {
    if (candidate.startsWith(baseDir) && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

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

    const file = (row.files || []).find((f: FileObj) => f.id === share.fileId);
    if (!file) return res.status(404).json({ message: "File not found in record" });

    const filePath = resolveSharedFilePath(file);

    if (!filePath) {
      return res.status(404).json({ message: "File missing on server" });
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
