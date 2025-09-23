// src/utils/multer.ts
import multer, { StorageEngine } from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

export interface FileMeta {
  originalName: string;
  uuid: string;
  mimetype: string;
}

export function createMulterUploader(
  uploadDir: string,
  fileMap: Record<string, FileMeta>
) {
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage: StorageEngine = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueId = uuidv4();
      const ext = path.extname(file.originalname);
      const newFileName = `${uniqueId}${ext}`;

      fileMap[newFileName] = {
        originalName: file.originalname,
        uuid: uniqueId,
        mimetype: file.mimetype,
      };

      cb(null, newFileName);
    },
  });

  return multer({
    storage,
    fileFilter: (_req, _file, cb) => cb(null, true),
  });
}
export const fabricatorDataMap = {};
export const fabricatorsUploads=createMulterUploader("public/fabricators",fabricatorDataMap)

export const rfqDataMap = {};
export const rfqUploads=createMulterUploader("public/rfq",rfqDataMap)

export const rfqResponseMap={}
export const rfqResponseUploads=createMulterUploader("public/rfqResponses",rfqResponseMap)

export const projectDataMap = {};
export const projectUploads=createMulterUploader("public/projects",projectDataMap);

export const estimationDataMap={};
export const estimationUploads=createMulterUploader("public/estimationManage",estimationDataMap)

export const rfiDataMap={}
export const rfiUploads= createMulterUploader("public/rfi",rfiDataMap)

export const rfiResponseDataMap={}
export const rfiResponseUploads=createMulterUploader("public/rfiResponse",rfiResponseDataMap)

