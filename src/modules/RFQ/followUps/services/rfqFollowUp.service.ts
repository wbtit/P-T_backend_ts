import { UPLOAD_BASE_DIR } from "../../../../utils/fileUtil";
import { Response } from "express";
import fs from "fs";
import path from "path";
import { AppError } from "../../../../config/utils/AppError";
import { streamFile } from "../../../../utils/fileUtil";
import { FileObject } from "../../../../shared/fileType";
import { RFQRepository } from "../../repositeries";
import {
  CreateRFQFollowUpInput,
  UpdateRFQFollowUpInput,
} from "../dtos";
import { RFQFollowUpRepository } from "../repositories";

export class RFQFollowUpService {
  private repository = new RFQFollowUpRepository();
  private rfqRepository = new RFQRepository();

  async create(
    rfqId: string,
    createdById: string,
    data: CreateRFQFollowUpInput
  ) {
    const rfq = await this.rfqRepository.getById({ id: rfqId });
    if (!rfq) throw new AppError("RFQ not found", 404);

    return this.repository.create(rfqId, createdById, data);
  }

  async getById(id: string) {
    const followUp = await this.repository.getById(id);
    if (!followUp) throw new AppError("RFQ follow-up not found", 404);
    return followUp;
  }

  async getByRfqId(rfqId: string) {
    const rfq = await this.rfqRepository.getById({ id: rfqId });
    if (!rfq) throw new AppError("RFQ not found", 404);

    return this.repository.getByRfqId(rfqId);
  }

  async update(id: string, data: UpdateRFQFollowUpInput) {
    const existing = await this.repository.getById(id);
    if (!existing) throw new AppError("RFQ follow-up not found", 404);
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    const existing = await this.repository.getById(id);
    if (!existing) throw new AppError("RFQ follow-up not found", 404);
    return this.repository.delete(id);
  }

  async getFile(id: string, fileId: string) {
    const followUp = await this.getById(id);
    const files = followUp.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);
    return fileObject;
  }

  async viewFile(id: string, fileId: string, res: Response) {
    const followUp = await this.getById(id);
    const files = followUp.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const baseDir = path.resolve();
    let relativePath = fileObject.path || "";
    if (relativePath.startsWith("/public/")) {
      relativePath = relativePath.slice("/public/".length);
    } else if (relativePath.startsWith("public/")) {
      relativePath = relativePath.slice("public/".length);
    }
    const filePath = path.join(baseDir, "public", relativePath);
    if (!fs.existsSync(filePath)) {
      throw new AppError("File not found on server", 404);
    }
    return streamFile(res, filePath, fileObject.originalName);
  }
}
