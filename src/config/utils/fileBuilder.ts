import fs from "fs";
import path from "path";
import { Response } from "express";
import mime from "mime";

import { FileObject } from "../../shared/fileType";

export function streamFile(res: Response, fileObject: FileObject) {
  try {
    const __dirname = path.resolve();
    const filePath = path.join(__dirname, fileObject.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    const mimeType = mime.getType(filePath) || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${fileObject.originalName}"`
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("File Streaming Error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong while viewing the file" });
  }
}

