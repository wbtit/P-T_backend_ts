import fs from "fs";
import path from "path";
import mime from "mime";
import { Response } from "express";
export const UPLOAD_BASE_DIR = process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), 'uploads');

interface StoredFilePathLike {
  path?: string | null;
  filename?: string | null;
}

export function resolveUploadFilePath(file: StoredFilePathLike) {
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
}

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
