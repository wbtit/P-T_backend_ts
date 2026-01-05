import { RFIRepository } from "../repositories";
import {
  CreateRfiResDto,
  UpdateRFIDto,
  CreateRFIDto,
  UpdateRfiResDto,
} from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { Response } from "express";
import { streamFile } from "../../../utils/fileUtil";
import fs from "fs";

const rfiRepo = new RFIRepository();

export class RFIService {
  async createRfi(data: CreateRFIDto, userId: string, isAproovedByAdmin: boolean) {
    const rfi = await rfiRepo.create(data, userId, isAproovedByAdmin);
    return rfi;
  }

  async updateRfi(id: string, data: UpdateRFIDto) {
    const existing = await rfiRepo.findById(id);
    if (!existing) throw new AppError("RFI not found", 404);

    const rfi = await rfiRepo.updateRFI(id, data);
    return rfi;
  }

  async getRfiById(id: string) {
    const existing = await rfiRepo.findById(id);
    if (!existing) throw new AppError("RFI not found", 404);
    const filtered = {
      ...existing,
      rfiresponse: Array.isArray(existing.rfiresponse)
        ? existing.rfiresponse.filter(resp => resp.parentResponseId === null)
        : [],
    };
    return filtered;
  }

  async sent(userId: string) {
    return await rfiRepo.senderRFI(userId);
  }

  async received(userId: string) {
    return await rfiRepo.inbox(userId);
  }

  async closeRfi(id: string) {
    return await rfiRepo.updateStatus(id);
  }

  async getFile(rfiId: string, fileId: string) {
    const rfi = await rfiRepo.findById(rfiId);
    if (!rfi) throw new AppError("RFI not found", 404);

    const files = rfi.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(id: string, fileId: string, res: Response) {
    console.log("📥 [viewFile] Called with:", { id, fileId });

    const rfi = await rfiRepo.findById(id);
    if (!rfi) {
    console.error("❌ [viewFile] Fabricator not found:", id);
    throw new AppError("Fabricator not found", 404);
  }

    const files = rfi.files as unknown as FileObject[];

    console.log("📂 [viewFile] Available files:", files.map(f => ({
    id: f.id,
    path: f.path,
    filename: f.filename,
    originalName: f.originalName,
  })));

    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);
    if (!fileObject) {
    console.warn("⚠️ [viewFile] File not found in fabricator.files", {
      fileId,
      availableFileIds: files.map(f => f.id),
    });
    throw new AppError("File not found", 404);
  }

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, fileObject.path); // ✅ use path, not filename;

    if (!fs.existsSync(filePath)) {
        console.error("🚨 [viewFile] File does not exist on disk:", filePath);
        throw new AppError("File not found on server", 404);
      }
    return streamFile(res, filePath, fileObject.originalName);
  }

  async getPendingRFIs(role: string) {
    return await rfiRepo.findPendingRFIs(role);
  }
}
