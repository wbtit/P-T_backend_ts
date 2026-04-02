import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { UPLOAD_BASE_DIR } from "./fileUtil";
import { Request, Response, NextFunction } from "express";

// --- DYNAMIC IMPORT CACHE FOR file-type ---
let fileTypeModule: any = null;
async function getFileType() {
  if (!fileTypeModule) {
    fileTypeModule = await import("file-type");
  }
  return fileTypeModule;
}

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
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/tiff", "application/zip", "application/x-zip-compressed",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/rtf",
  "application/json", "application/geo+json"
];

const TRUSTED_UNDETECTABLE = [
  ".dwg", ".dxf", ".dgn", ".rvt", ".rfa", ".ifc", ".stp", ".step", ".igs", ".iges",
  ".nwd", ".nwc", ".bcf", ".bimx", ".std", ".etabs", ".sdb", ".shx", ".dbf", ".prj",
  ".las", ".laz", ".pts", ".xyz"
];

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic"],
};

// SIZE LIMITS (in bytes)
const SIZE_LIMITS = {
  IMAGES: 10 * 1024 * 1024,      // 10MB
  DOCS: 50 * 1024 * 1024,        // 50MB
  CAD_BIM: 500 * 1024 * 1024,    // 500MB
  OTHER: 100 * 1024 * 1024      // 100MB
};

function createBadRequestError(message: string) {
  const err: any = new Error(message);
  err.statusCode = 400;
  return err;
}

// -----------------------------------------------------------------------------
// Validation helper
// -----------------------------------------------------------------------------
function validateFile(
  req: Request,
  file: Express.Multer.File,
  cb: Function,
  allowedExtensions?: string[]
) {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    const effectiveAllowedExtensions = allowedExtensions ?? SAFE_EXTENSIONS;
    const allowedMimeTypes = allowedExtensions
      ? Array.from(
          new Set(
            allowedExtensions.flatMap((allowedExt) => MIME_TYPES_BY_EXTENSION[allowedExt] ?? [])
          )
        )
      : SAFE_MIME_TYPES;

    if (!ext) {
      return cb(createBadRequestError("Missing file extension"));
    }

    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(createBadRequestError("Blocked file type"));
    }

    if (!effectiveAllowedExtensions.includes(ext)) {
      return cb(createBadRequestError("File type not allowed (extension check failed)"));
    }

    if (!allowedMimeTypes.includes(mime)) {
      return cb(createBadRequestError("File type not allowed (MIME check failed)"));
    }

    cb(null, true);
  } catch (err) {
    cb(new Error("File validation failed"));
  }
}

// -----------------------------------------------------------------------------
// Post-upload processing (magic bytes + disk write)
// -----------------------------------------------------------------------------
async function processUploadedFiles(req: Request, uploadDir: string, fileMap: Record<string, FileMeta>) {
  const files = req.files;
  if (!files) return;

  const allFiles: Express.Multer.File[] = Array.isArray(files)
    ? files
    : Object.values(files).flat();

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const { fileTypeFromBuffer } = await getFileType();

  for (const file of allFiles) {
    const ext = path.extname(file.originalname).toLowerCase();
    const result = await fileTypeFromBuffer(file.buffer);

    if (result) {
      // Reject if magic bytes don't match the declared MIME type
      if (result.mime !== file.mimetype) {
        const err: any = new Error(`Magic byte mismatch for ${file.originalname}: declared ${file.mimetype}, detected ${result.mime}`);
        err.statusCode = 400;
        throw err;
      }
    } else {
      // If undetectable, check if it's in the trusted list
      if (!TRUSTED_UNDETECTABLE.includes(ext)) {
        throw createBadRequestError(`Unrecognised file format for ${file.originalname}`);
      }
    }

    // Manual write to disk
    const id = uuidv4();
    const newName = `${id}${ext}`;
    const fullPath = path.join(uploadDir, newName);
    fs.writeFileSync(fullPath, file.buffer);

    // Track in fileMap
    fileMap[newName] = {
      originalName: file.originalname,
      uuid: id,
      mimetype: file.mimetype,
    };

    // Polyfill file properties used by downstream controllers/services
    (file as any).filename = newName;
    (file as any).path = fullPath;
    (file as any).destination = uploadDir;
  }
}

// -----------------------------------------------------------------------------
// Multer factory
// -----------------------------------------------------------------------------
function compose(middlewares: any[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    let index = -1;
    function dispatch(i: number): Promise<void> {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      let fn = middlewares[i];
      if (i === middlewares.length) return Promise.resolve();
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(req, res, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return dispatch(0).catch(next);
  };
}

export function createMulterUploader(
  uploadDir: string,
  fileMap: Record<string, FileMeta>,
  maxSizeBytes: number,
  allowedExtensions?: string[]
) {
  const uploader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, cb) => validateFile(req, file, cb, allowedExtensions),
  });

  return {
    single: (fieldname: string) => [
      uploader.single(fieldname),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          await processUploadedFiles(req, uploadDir, fileMap);
          next();
        } catch (err) {
          next(err);
        }
      }
    ],
    array: (fieldname: string, maxCount?: number) => [
      uploader.array(fieldname, maxCount),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          await processUploadedFiles(req, uploadDir, fileMap);
          next();
        } catch (err) {
          next(err);
        }
      }
    ],
    fields: (fields: { name: string; maxCount?: number }[]) => [
      uploader.fields(fields),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          await processUploadedFiles(req, uploadDir, fileMap);
          next();
        } catch (err) {
          next(err);
        }
      }
    ]
  };
}

// -----------------------------------------------------------------------------
// Uploaders for each module
// -----------------------------------------------------------------------------

export const fabricatorDataMap: Record<string, FileMeta> = {};
export const fabricatorsUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "fabricators"), fabricatorDataMap, SIZE_LIMITS.DOCS);

export const rfqDataMap: Record<string, FileMeta> = {};
export const rfqCDAttachmentsMap: Record<string, FileMeta> = {};

// Specialized combined uploader for RFQ
const rfqBaseUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SIZE_LIMITS.CAD_BIM },
  fileFilter: (req, file, cb) => validateFile(req, file, cb),
});

export const rfqCombinedUploads = compose([
  rfqBaseUploader.fields([
    { name: "files", maxCount: 50 },
    { name: "CDAttachments", maxCount: 50 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files) {
        if (files.files) {
          await processUploadedFiles({ ...req, files: files.files } as any, path.join(UPLOAD_BASE_DIR, "rfq"), rfqDataMap);
        }
        if (files.CDAttachments) {
          await processUploadedFiles({ ...req, files: files.CDAttachments } as any, path.join(UPLOAD_BASE_DIR, "rfqCDAttachments"), rfqCDAttachmentsMap);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  }
]);

export const rfqUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "rfq"), rfqDataMap, SIZE_LIMITS.CAD_BIM);
export const rfqResponseMap: Record<string, FileMeta> = {};
export const rfqResponseUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "rfqresponse"), rfqResponseMap, SIZE_LIMITS.DOCS);

export const rfqFollowUpMap: Record<string, FileMeta> = {};
export const rfqFollowUpUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "rfqfollowup"), rfqFollowUpMap, SIZE_LIMITS.DOCS);

export const projectDataMap: Record<string, FileMeta> = {};
export const projectUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "project"), projectDataMap, SIZE_LIMITS.DOCS);

export const estimationDataMap: Record<string, FileMeta> = {};
export const estimationUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "estimations"), estimationDataMap, SIZE_LIMITS.DOCS);

export const estimationTaskMap: Record<string, FileMeta> = {}
export const estimationTaskUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "estimationtasks"), estimationTaskMap, SIZE_LIMITS.DOCS);

export const estimationResponseMap: Record<string, FileMeta> = {};
export const estimationResponseUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "estimationresponse"), estimationResponseMap, SIZE_LIMITS.DOCS);

export const rfiDataMap: Record<string, FileMeta> = {};
export const rfiUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "rfi"), rfiDataMap, SIZE_LIMITS.DOCS);

export const rfiResponseDataMap: Record<string, FileMeta> = {};
export const rfiResponseUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "rfiresponse"), rfiResponseDataMap, SIZE_LIMITS.DOCS);

export const submittalsDataMap: Record<string, FileMeta> = {};
export const submittalUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "submittals"), submittalsDataMap, SIZE_LIMITS.CAD_BIM);

export const submittalsResDataMap: Record<string, FileMeta> = {};
export const submittalResponseUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "submittalsresponse"), submittalsResDataMap, SIZE_LIMITS.DOCS);

export const mileStoneResponseDataMap: Record<string, FileMeta> = {};
export const mileStoneResponseUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "milestoneresponse"), mileStoneResponseDataMap, SIZE_LIMITS.DOCS);

export const coDataMap: Record<string, FileMeta> = {};
export const coUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "changeorder"), coDataMap, SIZE_LIMITS.DOCS);

export const coResponseDataMap: Record<string, FileMeta> = {};
export const coResponseUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "coresponse"), coResponseDataMap, SIZE_LIMITS.DOCS);

export const designDrawingsDataMap: Record<string, FileMeta> = {};
export const designUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "designdrawings"), designDrawingsDataMap, SIZE_LIMITS.CAD_BIM);

export const designDrawingResponseDataMap: Record<string, FileMeta> = {};
export const designResponseUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "designdrawingresponse"), designDrawingResponseDataMap, SIZE_LIMITS.CAD_BIM);

export const connectionDesignerDataMap: Record<string, FileMeta> = {}
export const connectionDesignerUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "connectiondesigners"), connectionDesignerDataMap, SIZE_LIMITS.DOCS);

export const connectionDesignerFilesMap: Record<string, FileMeta> = {}
export const connectionDesignerFilesUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "connectiondesignerQuotation"), connectionDesignerFilesMap, SIZE_LIMITS.DOCS);

export const connectionDesignerCertificatesmap: Record<string, FileMeta> = {}
export const connectionDesignerCertificatesUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "connectiondesignerscertificates"), connectionDesignerCertificatesmap, SIZE_LIMITS.DOCS);

// Specialized combined uploader for Connection Designer
const cdBaseUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SIZE_LIMITS.DOCS },
  fileFilter: (req, file, cb) => validateFile(req, file, cb),
});

export const connectionDesignerCombinedUploads = compose([
  cdBaseUploader.fields([
    { name: 'files', maxCount: 50 },
    { name: 'certificates', maxCount: 50 }
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files) {
        if (files.files) {
          await processUploadedFiles({ ...req, files: files.files } as any, path.join(UPLOAD_BASE_DIR, "connectiondesigners"), connectionDesignerDataMap);
        }
        if (files.certificates) {
          await processUploadedFiles({ ...req, files: files.certificates } as any, path.join(UPLOAD_BASE_DIR, "connectiondesignerscertificates"), connectionDesignerCertificatesmap);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  }
]);

export const vendorMap: Record<string, FileMeta> = {};
export const vendorUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "vendors"), vendorMap, SIZE_LIMITS.DOCS);

export const vendorCertificatesMap: Record<string, FileMeta> = {};
export const vendorCertificatesUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "vendorcertificates"), vendorCertificatesMap, SIZE_LIMITS.DOCS);

// Specialized combined uploader for Vendor
const vendorBaseUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SIZE_LIMITS.DOCS },
  fileFilter: (req, file, cb) => validateFile(req, file, cb),
});

export const vendorCombinedUploads = compose([
  vendorBaseUploader.fields([
    { name: 'files', maxCount: 50 },
    { name: 'certificates', maxCount: 50 }
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files) {
        if (files.files) {
          await processUploadedFiles({ ...req, files: files.files } as any, path.join(UPLOAD_BASE_DIR, "vendors"), vendorMap);
        }
        if (files.certificates) {
          await processUploadedFiles({ ...req, files: files.certificates } as any, path.join(UPLOAD_BASE_DIR, "vendorcertificates"), vendorCertificatesMap);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  }
]);

export const notesDataMap: Record<string, FileMeta> = {}
export const notesUploads = createMulterUploader(path.join(UPLOAD_BASE_DIR, "notes"), notesDataMap, SIZE_LIMITS.DOCS);

export const teamMeetingNotesDataMap: Record<string, FileMeta> = {};
export const teamMeetingNotesUploads = createMulterUploader(
  path.join(UPLOAD_BASE_DIR, "team-meeting-notes"),
  teamMeetingNotesDataMap,
  SIZE_LIMITS.DOCS
);

export const teamMeetingNotesResponsesDataMap: Record<string, FileMeta> = {};
export const teamMeetingNotesResponsesUploads = createMulterUploader(
  path.join(UPLOAD_BASE_DIR, "team-meeting-notes-responses"),
  teamMeetingNotesResponsesDataMap,
  SIZE_LIMITS.DOCS
);

export const userProfilePicMap: Record<string, FileMeta> = {};
export const userProfilePicUploads = createMulterUploader(
  path.join(UPLOAD_BASE_DIR, "userprofiles"),
  userProfilePicMap,
  SIZE_LIMITS.IMAGES,
  [".jpg", ".jpeg", ".png", ".webp", ".heic"]
);
