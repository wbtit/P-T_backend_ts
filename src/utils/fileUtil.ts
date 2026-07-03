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

    // Support for projects moved to the completed_projects archive
    const parts = trimmedValue.split("/");
    if (parts.length >= 2) {
      if (parts[1] !== "completed_projects") {
        const completedPath = [parts[0], "completed_projects", ...parts.slice(1)].join("/");
        candidates.add(path.resolve(baseDir, completedPath));
      }

      // Fallback for fabricator name changes (e.g., commas removed from DB name)
      const sanitizedFab = parts[0].replace(/,/g, "").replace(/_+/g, "_");
      if (sanitizedFab !== parts[0]) {
        candidates.add(path.resolve(baseDir, [sanitizedFab, ...parts.slice(1)].join("/")));
        if (parts[1] !== "completed_projects") {
          candidates.add(path.resolve(baseDir, [sanitizedFab, "completed_projects", ...parts.slice(1)].join("/")));
        }
      }
    }
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
    return res.status(404).json({ error: "File not found" });
  }

  const mimeType = mime.getType(resolvedPath);
  const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitizedOriginalName}"`
  );

  const fileStream = fs.createReadStream(resolvedPath);

  // Handle stream errors (disk read failure, NAS disconnect etc.)
  fileStream.on("error", (err) => {
    console.error("Stream error in fileUtil:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "File could not be read" });
    }
  });

  fileStream.pipe(res);
}
