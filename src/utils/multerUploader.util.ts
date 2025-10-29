// src/utils/multer.ts
import multer, { StorageEngine } from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import { Request } from "express";

export interface FileMeta {
  originalName: string;
  uuid: string;
  mimetype: string;
}

// -----------------------------------------------------------------------------
// Civil-engineering safe lists
// -----------------------------------------------------------------------------
const SAFE_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".dwg", ".dxf", ".dgn", ".rvt", ".rfa", ".ifc", ".stp", ".step", ".igs", ".iges",
  ".3ds", ".obj", ".fbx", ".std", ".etabs", ".sdb", ".nwd", ".nwc", ".bcf", ".bimx",
  ".shp", ".shx", ".dbf", ".prj", ".geojson", ".kml", ".kmz", ".csv", ".xyz", ".pts",
  ".las", ".laz", ".tif", ".tiff", ".jpg", ".jpeg", ".png", ".bmp", ".webp", ".svg",
  ".heic", ".md", ".txt", ".rtf", ".odt", ".ods", ".odp", ".zip"
];

const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".vbs", ".js", ".msi", ".ps1", ".sh",
  ".php", ".asp", ".aspx", ".jsp", ".cgi", ".dll", ".sys", ".jar", ".py", ".rb",
  ".iso", ".vhd", ".vmdk", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",
  ".tmp", ".bak", ".log", ".lnk", ".url", ".eml", ".msg"
];

const SAFE_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/tiff",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/rtf",
  "application/json", "application/geo+json",
  "application/octet-stream", "application/zip"
];

// -----------------------------------------------------------------------------
// Validation helper
// -----------------------------------------------------------------------------
async function validateFile(req: Request, file: Express.Multer.File, cb: Function) {
  try {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ext) return cb(new Error("Missing file extension"));
    if (BLOCKED_EXTENSIONS.includes(ext)) return cb(new Error("Blocked file type"));
    if (!SAFE_EXTENSIONS.includes(ext))
      return cb(new Error("File type not allowed (extension check failed)"));

    const chunks: Buffer[] = [];
    for await (const chunk of file.stream) {
      chunks.push(chunk as Buffer);
      if (Buffer.concat(chunks).length > 4100) break; // read small sample
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.length > 0) {
      const fileType = await fileTypeFromBuffer(buffer);
      if (fileType && !SAFE_MIME_TYPES.includes(fileType.mime)) {
        return cb(new Error(`Unsafe or unrecognized MIME type: ${fileType.mime}`));
      }
    }
    cb(null, true);
  } catch {
    cb(new Error("File validation failed"));
  }
}

// -----------------------------------------------------------------------------
// Multer factory with validation
// -----------------------------------------------------------------------------
export function createMulterUploader(
  uploadDir: string,
  fileMap: Record<string, FileMeta>
) {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage: StorageEngine = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const id = uuidv4();
      const ext = path.extname(file.originalname);
      const newName = `${id}${ext}`;
      fileMap[newName] = {
        originalName: file.originalname,
        uuid: id,
        mimetype: file.mimetype,
      };
      cb(null, newName);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 3000 * 1024 * 1024 }, // 200 MB for CAD/BIM
    fileFilter: (req, file, cb) => validateFile(req, file, cb),
  });
}

// -----------------------------------------------------------------------------
// Uploaders for each module
// -----------------------------------------------------------------------------
export const fabricatorDataMap = {};
export const fabricatorsUploads = createMulterUploader("public/fabricators", fabricatorDataMap);

export const rfqDataMap = {};
export const rfqUploads = createMulterUploader("public/rfq", rfqDataMap);

export const rfqResponseMap = {};
export const rfqResponseUploads = createMulterUploader("public/rfqresponse", rfqResponseMap);

export const projectDataMap = {};
export const projectUploads = createMulterUploader("public/project", projectDataMap);

export const estimationDataMap = {};
export const estimationUploads = createMulterUploader("public/estimations", estimationDataMap);

export const rfiDataMap = {};
export const rfiUploads = createMulterUploader("public/rfi", rfiDataMap);

export const rfiResponseDataMap = {};
export const rfiResponseUploads = createMulterUploader("public/rfiresponse", rfiResponseDataMap);

export const submittalsDataMap = {};
export const submittalUploads = createMulterUploader("public/submittals", submittalsDataMap);

export const submittalsResDataMap = {};
export const submittalResponseUploads = createMulterUploader("public/submittalsresponse", submittalsResDataMap);

export const coDataMap = {};
export const coUploads = createMulterUploader("public/changeorder", coDataMap);

export const coResponseDataMap = {};
export const coResponseUploads = createMulterUploader("public/coresponse", coResponseDataMap);

export const designDrawingsDataMap = {};
export const designUploads = createMulterUploader("public/designdrawings", designDrawingsDataMap);

export const designDrawingResponseDataMap = {};
export const designResponseUploads = createMulterUploader("public/designdrawingresponse", designDrawingResponseDataMap);
