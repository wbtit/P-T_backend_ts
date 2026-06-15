import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { UPLOAD_BASE_DIR } from "./fileUtil";
import { Request, Response, NextFunction } from "express";
import { buildProjectFilePath, buildRfqFilePath, getUploaderCategory } from "./fileStorageHelper";
import { UserRole } from "@prisma/client";

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
  "image/jpeg", "image/png", "image/webp", "image/tiff",
  "image/tif", "image/x-tiff", "image/bmp", "image/svg+xml",
  "image/heic", "image/heif",
  "application/pdf", "application/x-pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/rtf",
  "application/rtf",
  "application/json", "application/geo+json",
  "application/zip", "application/x-zip-compressed",
  "application/x-zip", "application/zip-compressed",
  "application/octet-stream",
];

const TRUSTED_UNDETECTABLE = new Set([
  ".dwg", ".dxf", ".dgn", ".rvt", ".rfa", ".ifc", ".stp", ".step", ".igs", ".iges",
  ".nwd", ".nwc", ".bcf", ".bimx", ".std", ".etabs", ".sdb", ".shx", ".dbf", ".prj",
  ".las", ".laz", ".pts", ".xyz"
]);

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic"],
  ".bmp": ["image/bmp"],
  ".svg": ["image/svg+xml"],
  ".tif": ["image/tiff"],
  ".tiff": ["image/tiff"],
  ".zip": ["application/zip"],
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".xls": ["application/vnd.ms-excel"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".csv": ["text/csv"],
  ".rtf": ["text/rtf"],
  ".txt": ["text/plain"],
  ".geojson": ["application/geo+json", "application/json"],
};

const MIME_ALIASES: Record<string, string> = {
  "application/x-zip-compressed": "application/zip",
  "application/x-zip": "application/zip",
  "application/zip-compressed": "application/zip",
  "application/x-compressed": "application/zip",

  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/x-citrix-png": "image/png",
  "image/x-citrix-jpeg": "image/jpeg",
  "image/tif": "image/tiff",
  "image/x-tiff": "image/tiff",
  "image/x-tif": "image/tiff",

  "application/x-pdf": "application/pdf",
  "application/acrobat": "application/pdf",
  "application/x-acrobat": "application/pdf",

  "application/x-msword": "application/msword",
  "application/vnd.ms-word": "application/msword",

  "application/x-msexcel": "application/vnd.ms-excel",
  "application/x-excel": "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.macroenabled.12": "application/vnd.ms-excel",

  "application/x-mspowerpoint": "application/vnd.ms-powerpoint",

  "text/comma-separated-values": "text/csv",
  "application/csv": "text/csv",
  "application/excel": "text/csv",

  "text/x-rtf": "text/rtf",
  "application/rtf": "text/rtf",
  "application/x-rtf": "text/rtf",

  "image/svg": "image/svg+xml",

  "application/x-autocad": "application/octet-stream",
  "application/x-dwg": "application/octet-stream",
  "application/acad": "application/octet-stream",
  "image/x-dwg": "application/octet-stream",
  "image/vnd.dwg": "application/octet-stream",
  "application/dxf": "application/octet-stream",
  "image/x-dxf": "application/octet-stream",

  "application/x-step": "application/octet-stream",
  "model/step": "application/octet-stream",
  "model/iges": "application/octet-stream",

  "image/heif": "image/heic",
  "image/heif-sequence": "image/heic",
  "image/heic-sequence": "image/heic",

  "text/json": "application/json",
  "application/x-json": "application/json",
};

// SIZE LIMITS (in bytes)
const SIZE_LIMITS = {
  IMAGES: 10 * 1024 * 1024,      // 10MB
  DOCS: 50 * 1024 * 1024,        // 50MB
  CAD_BIM: 2048 * 1024 * 1024,   // 2GB
  ZIP: 5048 * 1024 * 1024,       // 5GB
  OTHER: 100 * 1024 * 1024      // 100MB
};

function createBadRequestError(message: string) {
  const err: any = new Error(message);
  err.statusCode = 400;
  return err;
}

function normalizeMime(mime: string) {
  const lower = mime.toLowerCase().trim();
  return MIME_ALIASES[lower] ?? lower;
}

function ensureUploadDir(uploadDir: string) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function flattenUploadedFiles(req: Request): Express.Multer.File[] {
  const files = req.files;
  if (!files) return [];

  return (Array.isArray(files) ? files : Object.values(files).flat()) as Express.Multer.File[];
}

function trackUploadedFile(file: Express.Multer.File, fileMap: Record<string, FileMeta>) {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = (file as any).filename || `${uuidv4()}${ext}`;
  const fullPath = (file as any).path || path.join((file as any).destination || "", filename);
  const uuid = path.basename(filename, ext);

  fileMap[filename] = {
    originalName: file.originalname,
    uuid,
    mimetype: file.mimetype,
  };

  (file as any).filename = filename;
  (file as any).path = fullPath;
  (file as any).destination = (file as any).destination || path.dirname(fullPath);
}

function createDiskStorage(uploadDir: string | ((req: Request) => string)) {
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        const dir = typeof uploadDir === 'function' ? uploadDir(req) : uploadDir;
        ensureUploadDir(dir);
        cb(null, dir);
      } catch (err) {
        cb(err as Error, "");
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

function createFieldDiskStorage(uploadDirsByField: Record<string, string | ((req: Request) => string)>, fallbackDir: string | ((req: Request) => string)) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const fieldDir = uploadDirsByField[file.fieldname] ?? fallbackDir;
        const uploadDir = typeof fieldDir === 'function' ? fieldDir(req) : fieldDir;
        ensureUploadDir(uploadDir);
        cb(null, uploadDir);
      } catch (err) {
        cb(err as Error, "");
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

// --- DYNAMIC IMPORT CACHE FOR file-type ---
let fileTypeModule: any = null;
async function getFileType() {
  if (!fileTypeModule) {
    fileTypeModule = await import("file-type");
  }
  return fileTypeModule;
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
    const normalizedDeclared = normalizeMime(file.mimetype);
    const effectiveAllowedExtensions = allowedExtensions ?? SAFE_EXTENSIONS;
    const allowedMimeTypes = allowedExtensions
      ? Array.from(
          new Set(
            allowedExtensions.flatMap((allowedExt) => MIME_TYPES_BY_EXTENSION[allowedExt] ?? [])
          )
        )
      : SAFE_MIME_TYPES.map((mimeType) => normalizeMime(mimeType));

    if (!ext) {
      return cb(createBadRequestError("Missing file extension"));
    }

    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(createBadRequestError("Blocked file type"));
    }

    if (!effectiveAllowedExtensions.includes(ext)) {
      return cb(createBadRequestError("File type not allowed (extension check failed)"));
    }

    if (!allowedMimeTypes.includes(normalizedDeclared)) {
      return cb(createBadRequestError("File type not allowed (MIME check failed)"));
    }

    cb(null, true);
  } catch (err) {
    cb(new Error("File validation failed"));
  }
}

// -----------------------------------------------------------------------------
// Post-upload processing
// -----------------------------------------------------------------------------
async function processMemoryUploadedFiles(req: Request, uploadDir: string | ((req: Request) => string), fileMap: Record<string, FileMeta>) {
  const allFiles = flattenUploadedFiles(req);
  if (allFiles.length === 0) return;

  const resolvedDir = typeof uploadDir === 'function' ? uploadDir(req) : uploadDir;
  ensureUploadDir(resolvedDir);
  const { fileTypeFromBuffer } = await getFileType();

  for (const file of allFiles) {
    const ext = path.extname(file.originalname).toLowerCase();
    const declaredMime = normalizeMime(file.mimetype);
    const result = await fileTypeFromBuffer(file.buffer);
    const skipMimeComparison =
      declaredMime === "application/octet-stream" && TRUSTED_UNDETECTABLE.has(ext);

    if (result && !skipMimeComparison) {
      // Reject if magic bytes don't match the declared MIME type
      const detectedMime = normalizeMime(result.mime);

      if (declaredMime !== detectedMime) {
        const err: any = new Error(`Magic byte mismatch for ${file.originalname}: declared ${file.mimetype}, detected ${result.mime}`);
        err.statusCode = 400;
        throw err;
      }
    } else if (!result && !TRUSTED_UNDETECTABLE.has(ext)) {
      throw createBadRequestError(`Unrecognised file format for ${file.originalname}`);
    }

    const filename = `${uuidv4()}${ext}`;
    const fullPath = path.join(resolvedDir, filename);
    fs.writeFileSync(fullPath, file.buffer);

    (file as any).filename = filename;
    (file as any).path = fullPath;
    (file as any).destination = resolvedDir;
    trackUploadedFile(file, fileMap);
  }
}

async function processStreamUploadedFiles(req: Request, _uploadDir: string | ((req: Request) => string), fileMap: Record<string, FileMeta>) {
  const allFiles = flattenUploadedFiles(req);
  if (allFiles.length === 0) return;

  for (const file of allFiles) {
    trackUploadedFile(file, fileMap);
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
      if (i === middlewares.length) {
        next();
        return Promise.resolve();
      }
      if (!fn) {
        next();
        return Promise.resolve();
      }
      const boundNext = (err?: any) => {
        if (err) return Promise.reject(err);
        return dispatch(i + 1);
      };
      try {
        return Promise.resolve(fn(req, res, boundNext));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return dispatch(0).catch(next);
  };
}

function createUploader(
  storage: multer.StorageEngine,
  uploadDir: string | ((req: Request) => string),
  fileMap: Record<string, FileMeta>,
  maxSizeBytes: number,
  allowedExtensions: string[] | undefined,
  processor: (req: Request, uploadDir: string | ((req: Request) => string), fileMap: Record<string, FileMeta>) => Promise<void>
) {
  const uploader = multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, cb) => validateFile(req, file, cb, allowedExtensions),
  });

  return {
    single: (fieldname: string) => [
      uploader.single(fieldname),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          await processor(req, uploadDir, fileMap);
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
          await processor(req, uploadDir, fileMap);
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
          await processor(req, uploadDir, fileMap);
          next();
        } catch (err) {
          next(err);
        }
      }
    ]
  };
}

export function createMemoryUploader(
  uploadDir: string | ((req: Request) => string),
  fileMap: Record<string, FileMeta>,
  maxSizeBytes: number,
  allowedExtensions?: string[]
) {
  return createUploader(
    multer.memoryStorage(),
    uploadDir,
    fileMap,
    maxSizeBytes,
    allowedExtensions,
    processMemoryUploadedFiles
  );
}

export function createStreamUploader(
  uploadDir: string | ((req: Request) => string),
  fileMap: Record<string, FileMeta>,
  maxSizeBytes: number,
  allowedExtensions?: string[]
) {
  return createUploader(
    createDiskStorage(uploadDir),
    uploadDir,
    fileMap,
    maxSizeBytes,
    allowedExtensions,
    processStreamUploadedFiles
  );
}

export const createMulterUploader = createMemoryUploader;

// -----------------------------------------------------------------------------
// Uploaders for each module
// -----------------------------------------------------------------------------


/**
 * Multer destination for project-context uploads (RFI, Submittal, CO, etc.)
 * Requires query params: fabricatorName, projectName
 * Optional query param: projectCode
 */
export function projectUploadDestination(req: Request): string {
  const { fabricatorName, projectName, projectCode } = req.query as Record<string, string>

  if (!fabricatorName) throw new Error("fabricatorName query param is required for upload")
  if (!projectName) throw new Error("projectName query param is required for upload")

  const role = (req as any).user?.role as UserRole
  const category = getUploaderCategory(role)

  // Return directory only (no filename) — multer appends filename
  const fullPath = buildProjectFilePath({
    fabricatorName,
    projectCode: projectCode || null,
    projectName,
    category,
    filename: "",   // empty — multer handles filename
  })

  // Strip trailing slash from the directory portion
  return path.join(UPLOAD_BASE_DIR, fullPath.replace(/\/$/, ""))
}

/**
 * Multer destination for RFQ uploads.
 * Requires query params: fabricatorName, rfqProjectName
 * Optional query param: rfqSerialNo
 */
export function rfqUploadDestination(req: Request): string {
  const { fabricatorName, rfqProjectName, rfqSerialNo } = req.query as Record<string, string>

  if (!fabricatorName) throw new Error("fabricatorName query param is required for upload")
  if (!rfqProjectName) throw new Error("rfqProjectName query param is required for upload")

  const role = (req as any).user?.role as UserRole
  const category = getUploaderCategory(role)

  const fullPath = buildRfqFilePath({
    fabricatorName,
    rfqSerialNo: rfqSerialNo || null,
    rfqProjectName,
    category,
    filename: "",
  })

  return path.join(UPLOAD_BASE_DIR, fullPath.replace(/\/$/, ""))
}


export const fabricatorDataMap: Record<string, FileMeta> = {};
export const fabricatorsUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "fabricators"), fabricatorDataMap, SIZE_LIMITS.ZIP);

export const rfqDataMap: Record<string, FileMeta> = {};
export const rfqCDAttachmentsMap: Record<string, FileMeta> = {};

// Specialized combined uploader for RFQ
const rfqBaseUploader = multer({
  storage: createFieldDiskStorage(
    {
      files: rfqUploadDestination,
      CDAttachments: rfqUploadDestination,
    },
    rfqUploadDestination
  ),
  limits: { fileSize: SIZE_LIMITS.ZIP },
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
          await processStreamUploadedFiles({ ...req, files: files.files } as any, rfqUploadDestination, rfqDataMap);
        }
        if (files.CDAttachments) {
          await processStreamUploadedFiles({ ...req, files: files.CDAttachments } as any, rfqUploadDestination, rfqCDAttachmentsMap);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  }
]);

export const rfqUploads = createStreamUploader(rfqUploadDestination, rfqDataMap, SIZE_LIMITS.ZIP);
export const rfqResponseMap: Record<string, FileMeta> = {};
export const rfqResponseUploads = createStreamUploader(rfqUploadDestination, rfqResponseMap, SIZE_LIMITS.ZIP);

export const rfqFollowUpMap: Record<string, FileMeta> = {};
export const rfqFollowUpUploads = createStreamUploader(rfqUploadDestination, rfqFollowUpMap, SIZE_LIMITS.ZIP);

export const projectDataMap: Record<string, FileMeta> = {};
export const projectUploads = createStreamUploader(projectUploadDestination, projectDataMap, SIZE_LIMITS.ZIP);

export const estimationDataMap: Record<string, FileMeta> = {};
export const estimationUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "estimations"), estimationDataMap, SIZE_LIMITS.ZIP);

export const estimationTaskMap: Record<string, FileMeta> = {}
export const estimationTaskUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "estimationtasks"), estimationTaskMap, SIZE_LIMITS.ZIP);

export const estimationResponseMap: Record<string, FileMeta> = {};
export const estimationResponseUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "estimationresponse"), estimationResponseMap, SIZE_LIMITS.ZIP);

export const rfiDataMap: Record<string, FileMeta> = {};
export const rfiUploads = createStreamUploader(projectUploadDestination, rfiDataMap, SIZE_LIMITS.ZIP);

export const rfiResponseDataMap: Record<string, FileMeta> = {};
export const rfiResponseUploads = createStreamUploader(projectUploadDestination, rfiResponseDataMap, SIZE_LIMITS.ZIP);

export const submittalsDataMap: Record<string, FileMeta> = {};
export const submittalUploads = createStreamUploader(projectUploadDestination, submittalsDataMap, SIZE_LIMITS.ZIP);

export const bfaDataMap: Record<string, FileMeta> = {};
export const bfaUploads = createStreamUploader(projectUploadDestination, bfaDataMap, SIZE_LIMITS.ZIP);


export const submittalsResDataMap: Record<string, FileMeta> = {};
export const submittalResponseUploads = createStreamUploader(projectUploadDestination, submittalsResDataMap, SIZE_LIMITS.ZIP);

export const mileStoneResponseDataMap: Record<string, FileMeta> = {};
export const mileStoneResponseUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "milestoneresponse"), mileStoneResponseDataMap, SIZE_LIMITS.ZIP);

export const coDataMap: Record<string, FileMeta> = {};
export const coUploads = createStreamUploader(projectUploadDestination, coDataMap, SIZE_LIMITS.ZIP);

export const coResponseDataMap: Record<string, FileMeta> = {};
export const coResponseUploads = createStreamUploader(projectUploadDestination, coResponseDataMap, SIZE_LIMITS.ZIP);

export const designDrawingsDataMap: Record<string, FileMeta> = {};
export const designUploads = createStreamUploader(projectUploadDestination, designDrawingsDataMap, SIZE_LIMITS.ZIP);

export const designDrawingResponseDataMap: Record<string, FileMeta> = {};
export const designResponseUploads = createStreamUploader(projectUploadDestination, designDrawingResponseDataMap, SIZE_LIMITS.ZIP);

export const projectProgressReportDataMap: Record<string, FileMeta> = {};
export const projectProgressReportUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "projectprogressreport"), projectProgressReportDataMap, SIZE_LIMITS.ZIP);

export const projectProgressReportResponseDataMap: Record<string, FileMeta> = {};
export const projectProgressReportResponseUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "projectprogressreportresponse"), projectProgressReportResponseDataMap, SIZE_LIMITS.ZIP);

export const coordinationDrawingDataMap: Record<string, FileMeta> = {};
export const coordinationDrawingUploads = createStreamUploader(projectUploadDestination, coordinationDrawingDataMap, SIZE_LIMITS.ZIP);

export const coordinationDrawingResponseDataMap: Record<string, FileMeta> = {};
export const coordinationDrawingResponseUploads = createStreamUploader(projectUploadDestination, coordinationDrawingResponseDataMap, SIZE_LIMITS.ZIP);

export const connectionDesignerDataMap: Record<string, FileMeta> = {}
export const connectionDesignerUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "connectiondesigners"), connectionDesignerDataMap, SIZE_LIMITS.ZIP);

export const connectionDesignerFilesMap: Record<string, FileMeta> = {}
export const connectionDesignerFilesUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "connectiondesignerQuotation"), connectionDesignerFilesMap, SIZE_LIMITS.ZIP);

export const connectionDesignerCertificatesmap: Record<string, FileMeta> = {}
export const connectionDesignerCertificatesUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "connectiondesignerscertificates"), connectionDesignerCertificatesmap, SIZE_LIMITS.ZIP);

const cdBaseUploader = multer({
  storage: createFieldDiskStorage(
    {
      files: path.join(UPLOAD_BASE_DIR, "connectiondesigners"),
      certificates: path.join(UPLOAD_BASE_DIR, "connectiondesignerscertificates"),
    },
    path.join(UPLOAD_BASE_DIR, "connectiondesigners")
  ),
  limits: { fileSize: SIZE_LIMITS.ZIP },
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
          await processStreamUploadedFiles({ ...req, files: files.files } as any, path.join(UPLOAD_BASE_DIR, "connectiondesigners"), connectionDesignerDataMap);
        }
        if (files.certificates) {
          await processStreamUploadedFiles({ ...req, files: files.certificates } as any, path.join(UPLOAD_BASE_DIR, "connectiondesignerscertificates"), connectionDesignerCertificatesmap);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  }
]);

export const vendorMap: Record<string, FileMeta> = {};
export const vendorUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "vendors"), vendorMap, SIZE_LIMITS.ZIP);

export const vendorCertificatesMap: Record<string, FileMeta> = {};
export const vendorCertificatesUploads = createStreamUploader(path.join(UPLOAD_BASE_DIR, "vendorcertificates"), vendorCertificatesMap, SIZE_LIMITS.ZIP);

// Specialized combined uploader for Vendor
const vendorBaseUploader = multer({
  storage: createFieldDiskStorage(
    {
      files: path.join(UPLOAD_BASE_DIR, "vendors"),
      certificates: path.join(UPLOAD_BASE_DIR, "vendorcertificates"),
    },
    path.join(UPLOAD_BASE_DIR, "vendors")
  ),
  limits: { fileSize: SIZE_LIMITS.ZIP },
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
          await processStreamUploadedFiles({ ...req, files: files.files } as any, path.join(UPLOAD_BASE_DIR, "vendors"), vendorMap);
        }
        if (files.certificates) {
          await processStreamUploadedFiles({ ...req, files: files.certificates } as any, path.join(UPLOAD_BASE_DIR, "vendorcertificates"), vendorCertificatesMap);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  }
]);

export const notesDataMap: Record<string, FileMeta> = {}
export const notesUploads = createStreamUploader(projectUploadDestination, notesDataMap, SIZE_LIMITS.ZIP);

export const teamMeetingNotesDataMap: Record<string, FileMeta> = {};
export const teamMeetingNotesUploads = createStreamUploader(
  projectUploadDestination,
  teamMeetingNotesDataMap,
  SIZE_LIMITS.ZIP
);

export const teamMeetingNotesResponsesDataMap: Record<string, FileMeta> = {};
export const teamMeetingNotesResponsesUploads = createStreamUploader(
  projectUploadDestination,
  teamMeetingNotesResponsesDataMap,
  SIZE_LIMITS.ZIP
);

export const userProfilePicMap: Record<string, FileMeta> = {};
export const userProfilePicUploads = createMemoryUploader(
  path.join(UPLOAD_BASE_DIR, "userprofiles"),
  userProfilePicMap,
  SIZE_LIMITS.IMAGES,
  [".jpg", ".jpeg", ".png", ".webp", ".heic"]
);

export const invoiceWireTransferDataMap: Record<string, FileMeta> = {};
export const invoiceWireTransferUploads = createStreamUploader(
  path.join(UPLOAD_BASE_DIR, "invoicewiretransfer"),
  invoiceWireTransferDataMap,
  SIZE_LIMITS.ZIP
);
