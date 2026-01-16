import path from "path";

export function mapUploadedFiles(files: Express.Multer.File[], entity: string) {
  if (!files || files.length === 0) return [];

  return files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    id: file.filename.split(".")[0], // Extract UUID
    path: path.join(`${entity}/${file.filename}`), // Entity-specific relative path
  }));
}
