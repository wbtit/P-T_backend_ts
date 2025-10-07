import { CreateCoResponseDto } from "../dtos";
import { CoResponseRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { streamFile } from "../../../utils/fileUtil";
import { Response } from "express";

const coResponseRepo = new CoResponseRepository();

export class CoResponseService {
  async createCoResponse(data: CreateCoResponseDto, CoId: string, userId: string) {
    if (!data.parentResponseId) {
      throw new AppError("ParentResponseId is required for top-level responses", 400);
    }

    return await coResponseRepo.createCoResponse({
      ...data,
      CoId,
      userId,
    });
  }

  async getResponseById(id: string) {
    const response = await coResponseRepo.getResponseById(id);
    if (!response) throw new AppError("COResponse not found", 404);
    return response;
  }

  async findById(id: string) {
    const response = await coResponseRepo.findbyId(id);
    if (!response) throw new AppError("COResponse not found", 404);
    return response;
  }

  async getFile(coResponseId: string, fileId: string) {
    const response = await coResponseRepo.findbyId(coResponseId);
    if (!response) throw new AppError("COResponse not found", 404);

    const files = response.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(coResponseId: string, fileId: string, res: Response) {
    const fileObject = await this.getFile(coResponseId, fileId);

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, fileObject.filename);

    return streamFile(res, filePath, fileObject.originalName);
  }

  async findByCoId(coId: string) {
    return await coResponseRepo.findbyId(coId);
  }
}
