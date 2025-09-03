import fs from "fs";
import path from "path";
import mime from "mime";
import { Response } from "express";
export function streamFile(res:Response, filePath: string, originalName: string) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found on server" });
  }

  const mimeType = mime.getType(filePath);
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${originalName}"`
  );

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}
