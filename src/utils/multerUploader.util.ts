import multer, { StorageEngine } from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { Request } from "express";

export interface FileMeta {
  originalName: string;
  uuid: string;
  mimetype: string;
}

// -----------------------------------------------------------------------------
// Safe lists
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
  "image/jpeg", "image/png", "image/webp", "image/tiff","application/zip",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/rtf",
  "application/json", "application/geo+json",
  "application/octet-stream", ""
];

// -----------------------------------------------------------------------------
// Validation helper (safe for array uploads)
// -----------------------------------------------------------------------------
function validateFile(req: Request, file: Express.Multer.File, cb: Function) {
  try {
    console.log(`🧩 Validating file: ${file.originalname}`);
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    console.log(`➡️  Extension: ${ext}, MIME (reported): ${mime}`);

    if (!ext) {
      console.log("❌ Missing file extension");
      return cb(new Error("Missing file extension"));
    }

    if (BLOCKED_EXTENSIONS.includes(ext)) {
      console.log(`🚫 Blocked extension detected: ${ext}`);
      return cb(new Error("Blocked file type"));
    }

    if (!SAFE_EXTENSIONS.includes(ext)) {
      console.log(`❌ Not in SAFE_EXTENSIONS: ${ext}`);
      return cb(new Error("File type not allowed (extension check failed)"));
    }

    if (!SAFE_MIME_TYPES.includes(mime)) {
      console.log(`❌ Not in SAFE_MIME_TYPES: ${mime}`);
      return cb(new Error("File type not allowed (MIME check failed)"));
    }

    console.log("✅ File passed validation");
    cb(null, true);
  } catch (err) {
    console.error("💥 File validation error:", err);
    cb(new Error("File validation failed"));
  }
}

// -----------------------------------------------------------------------------
// Multer factory
// -----------------------------------------------------------------------------
export function createMulterUploader(uploadDir: string, fileMap: Record<string, FileMeta>) {
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
    limits: { fileSize: 3000 * 1024 * 1024 }, // 3GB
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

export const estimationTaskMap={}
export const estimationTaskUploads = createMulterUploader("public/estimationtasks", estimationTaskMap);


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

export const connectionDesignerDataMap={}
export const connectionDesignerUploads = createMulterUploader("public/connectiondesigners", connectionDesignerDataMap);

export const connectionDesignerCertificatesmap={}
export const connectionDesignerCertificatesUploads = createMulterUploader("public/connectiondesignerscertificates", connectionDesignerCertificatesmap);


export const vendorMap = {};
export const vendorUploads = createMulterUploader("public/vendors", vendorMap);

export const vendorCertificatesMap = {};
export const vendorCertificatesUploads = createMulterUploader("public/vendorcertificates", vendorCertificatesMap);

export const notesDataMap={}
export const notesUploads = createMulterUploader("public/notes", notesDataMap);



