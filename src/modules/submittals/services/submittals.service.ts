import { SubmitalRepository } from "../repositories";
import { createSubDto, updateSubDto } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { Response } from "express";
import { streamFile } from "../../../utils/fileUtil";

const submittalRepo = new SubmitalRepository();

export class SubmittalService {
  async createSubmittal(data: createSubDto, userId: string, isAproovedByAdmin: boolean) {
    return await submittalRepo.create(data, userId, isAproovedByAdmin);
  }

  async updateSubmittal(id: string, data: updateSubDto) {
    const existing = await submittalRepo.findById(id);
    if (!existing) throw new AppError("Submittal not found", 404);

    return await submittalRepo.update(id, data);
  }

  async getSubmittalById(id: string) {
    const existing = await submittalRepo.findById(id);
    if (!existing) throw new AppError("Submittal not found", 404);

    // ✅ optionally filter submittalsResponse like RFI
    const filtered = {
      ...existing,
      submittalsResponse: Array.isArray(existing.submittalsResponse)
        ? existing.submittalsResponse.filter(resp => resp.parentResponseId === null)
        : [],
    };
    return filtered;
  }

  async sent(userId: string) {
    return await submittalRepo.sentSubmittals(userId);
  }

  async received(userId: string) {
    return await submittalRepo.receivedSubmittals(userId);
  }


  async findByProject(projectId: string) {
    return await submittalRepo.findByProject(projectId);
  }

  async getFile(submittalId: string, fileId: string) {
    const submittal = await submittalRepo.findById(submittalId);
    if (!submittal) throw new AppError("Submittal not found", 404);

    const files = submittal.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(id: string, fileId: string, res: Response) {
    const submittal = await submittalRepo.findById(id);
    if (!submittal) throw new AppError("Submittal not found", 404);

    const files = submittal.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, fileObject.filename);

    return streamFile(res, filePath, fileObject.originalName);
  }
}
