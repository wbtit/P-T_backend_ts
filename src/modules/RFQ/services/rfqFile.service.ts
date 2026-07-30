import { Response } from "express";
import { RFQRepository } from "../repositeries/rfq.repository";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";

const rfqrepo = new RFQRepository();

export class RFQFileService {
    async getFile(rfqId: string, fileId: string) {
        const rfq = await rfqrepo.getById({ id: rfqId });
        if (!rfq) throw new AppError("RFQ not found", 404);
        
        const files = rfq.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);

        return fileObject;
    }

    async viewFile(id: string, fileId: string, res: Response) {
        const rfq = await rfqrepo.getById({ id });
        if (!rfq) throw new AppError("RFQ not found", 404);

        const files = rfq.files as unknown as FileObject[];
        const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
        const fileObject = files.find((file: FileObject) => file.id === cleanFileId);

        if (!fileObject) {
            console.warn("⚠️ [viewFile] File not found in rfq.files", {
                fileId,
                availableFileIds: files.map(f => f.id),
            });
            throw new AppError("File not found", 404);
        }

        const filePath = resolveUploadFilePath(fileObject);

        if (!filePath) {
            console.error("🚨 [viewFile] File does not exist on disk:", filePath);
            throw new AppError("File not found on server", 404);
        }
        
        return streamFile(res, filePath, fileObject.originalName);
    }
}
