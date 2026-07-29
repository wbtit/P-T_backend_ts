import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { FabricatorRepository } from "../repositories";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import fs from "fs";

const fabRepo = new FabricatorRepository();

export class FabricatorFileService {
  async getFile(fabricatorId: string, fileId: string) {
    const fabricator = await fabRepo.findById({ id: fabricatorId });
    if (!fabricator) throw new AppError("Fabricator not found", 404);

    const files = fabricator.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(fabricatorId: string, fileId: string, res: Response) {
    const fabricator = await fabRepo.findById({ id: fabricatorId });
    if (!fabricator) throw new AppError("Fabricator not found", 404);

    const files = fabricator.files as unknown as FileObject[];

    // Strip file extension from the id before matching (e.g. "uuid.jpg" → "uuid")
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const filePath = resolveUploadFilePath(fileObject);
    if (!filePath) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }

  async deleteFile(fabricatorId: string, fileId: string) {
    const fabricator = await fabRepo.findById({ id: fabricatorId });
    if (!fabricator) throw new AppError("Fabricator not found", 404);

    const files = fabricator.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file) => file.id === cleanFileId);

    if (fileObject) {
      const filePath = resolveUploadFilePath(fileObject);
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Failed to physically delete file:", err);
        }
      }
    }

    const updatedFiles = files.filter((file) => file.id !== cleanFileId);

    return fabRepo.update({ id: fabricatorId }, { files: updatedFiles });
  }
}
