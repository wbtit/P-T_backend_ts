import path from "path";
import { UPLOAD_BASE_DIR } from "../../utils/fileUtil";

export function mapUploadedFiles(files: Express.Multer.File[], entityOrBasePath: string) {
  if (!files || files.length === 0) return [];

  return files.map((file) => {
    let relativePath = path.join(entityOrBasePath, file.filename).replace(/\\/g, '/');

    if (file.path && path.resolve(file.path).startsWith(path.resolve(UPLOAD_BASE_DIR))) {
      relativePath = path.relative(UPLOAD_BASE_DIR, file.path).replace(/\\/g, '/');
    }

    return {
      filename: file.filename,
      originalName: file.originalname,
      id: file.filename.split(".")[0], // Extract UUID
      path: relativePath,
    };
  });
}
