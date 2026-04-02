import fs from "fs";
import path from "path";
import mime from "mime";
import { Response } from "express";
export const UPLOAD_BASE_DIR = process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), 'uploads');

export function streamFile(res:Response, filePath: string, originalName: string) {
  const resolvedPath = path.resolve(filePath);
  const resolvedBaseDir = path.resolve(UPLOAD_BASE_DIR);

  if (!resolvedPath.startsWith(resolvedBaseDir)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ message: "File not found on server" });
  }

  const mimeType = mime.getType(resolvedPath);
  const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitizedOriginalName}"`
  );

  const fileStream = fs.createReadStream(resolvedPath);
  fileStream.pipe(res);
}
