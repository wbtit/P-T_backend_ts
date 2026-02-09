import crypto from "crypto";
import prisma from "../config/database/client";
import mime from "mime";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";




interface FileObj {
  id: string;
  path: string;
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
  changeOrders:"changeOrders",
  cOResponse:"cOResponse",
  estimation:"estimation",
  connectionDesignerQuota: "connectionDesignerQuota",
};

const createShareLink = async (req: Request, res: Response) => {
  try {
    const { table, parentId, fileId } = req.params;

    const modelName = MODEL_MAP[table];
    if (!modelName) {
      return res.status(400).json({ message: "Invalid table" });
    }

    // fetch parent row
    const row = await (prisma as any)[modelName].findUnique({
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
    console.log("Share URL:", shareUrl);
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
    console.log("[downloadShare] request", { token });

    const share = await prisma.fileShareLink.findUnique({
      where: { token },
    });
    console.log("[downloadShare] share lookup", { found: Boolean(share) });

    if (!share) return res.status(404).json({ message: "Invalid link" });

    const modelName = MODEL_MAP[share.parentTable];
    console.log("[downloadShare] model resolved", {
      parentTable: share.parentTable,
      modelName,
      parentId: share.parentId,
      fileId: share.fileId,
    });
    if (!modelName)
      return res.status(400).json({ message: "Invalid table in link" });

    const row = await (prisma as any)[modelName].findUnique({
      where: { id: share.parentId },
    });
    console.log("[downloadShare] parent row", { found: Boolean(row) });

    if (!row) return res.status(404).json({ message: "Parent record not found" });

    const file = (row.files || []).find((f: FileObj) => f.id === share.fileId);
    console.log("[downloadShare] file lookup", {
      found: Boolean(file),
      filePath: file?.path,
      originalName: file?.originalName,
    });
    if (!file) return res.status(404).json({ message: "File not found in record" });

    const root =
      process.env.PUBLIC_DIR || path.join(__dirname, "..", "..", "public");
    console.log("[downloadShare] root resolved", { root });

    // Handle both old format (/public/...) and new format (rfq/...)
    let relativePath = file.path;
    if (file.path.startsWith('/public/')) {
      relativePath = file.path.substring('/public/'.length);
    }

    const filePath = path.join(root, relativePath);
    console.log("[downloadShare] file path", { relativePath, filePath });

    if (!fs.existsSync(filePath)) {
      console.log("[downloadShare] file missing on server", { filePath });
      return res.status(404).json({ message: "File missing on server" });
    }

    const stat = fs.statSync(filePath);
    const mimeType = mime.getType(filePath) || "application/octet-stream";
    console.log("[downloadShare] file metadata", {
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
