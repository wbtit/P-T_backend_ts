import { Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { RFQFollowUpRepository } from "../repositories/rfqFollowUp.repository";
import { FileObject } from "../../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../../utils/fileUtil";

export class RFQFollowUpFileService {
  private repository = new RFQFollowUpRepository();

  async getFile(id: string, fileId: string) {
    const followUp = await this.repository.getById(id);
    if (!followUp) throw new AppError("RFQ follow-up not found", 404);
    const files = followUp.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);
    return fileObject;
  }

  async viewFile(id: string, fileId: string, res: Response) {
    const followUp = await this.repository.getById(id);
    if (!followUp) throw new AppError("RFQ follow-up not found", 404);
    const files = followUp.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const filePath = resolveUploadFilePath(fileObject);
    if (!filePath) {
      throw new AppError("File not found on server", 404);
    }
    return streamFile(res, filePath, fileObject.originalName);
  }
}
