import { DesignDrawingsRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import {
  CreateDesignDrawingsInput,
  UpdateDesignDrawingsInput,
  CreateDesignDrawingsResponsesInput,
} from "../dtos";
import { FileObject } from "../../../shared/fileType";
import { Response } from "express";
import path from "path";
import { streamFile } from "../../../utils/fileUtil";

const designRepo = new DesignDrawingsRepository();

export class DesignDrawingsService {
  // ✅ Create new Design Drawing
  async create(data: CreateDesignDrawingsInput, userId: string) {
    return await designRepo.createDesignDrawings(data, userId);
  }

  // ✅ Get all design drawings of a project
  async getByProjectId(projectId: string) {
    const records = await designRepo.getDDByProjectId(projectId);
    if (!records || records.length === 0)
      throw new AppError("No design drawings found for this project", 404);
    return records;
  }

  // ✅ Update stage or description of design drawing
  async updateStage(id: string, data: UpdateDesignDrawingsInput) {
    const existing = await designRepo.findDDById(id);
    if (!existing) throw new AppError("Design Drawing not found", 404);
    return await designRepo.updateStage(id, data.stage!, data);
  }

  // ✅ Get all Design Drawings (admin-level)
  async getAll() {
    return await designRepo.getAllDDs();
  }

  // ✅ Find Design Drawing by ID
  async findById(id: string) {
    const drawing = await designRepo.findDDById(id);
    if (!drawing) throw new AppError("Design Drawing not found", 404);
    return drawing;
  }

  // ✅ Delete Design Drawing
  async delete(id: string) {
    const drawing = await designRepo.findDDById(id);
    if (!drawing) throw new AppError("Design Drawing not found", 404);
    return await designRepo.deleteDD(id);
  }

  // ✅ Create a response for a Design Drawing
  async createResponse(data: CreateDesignDrawingsResponsesInput, userId: string) {
    const drawing = await designRepo.findDDById(data.designDrawingsId);
    if (!drawing) throw new AppError("Design Drawing not found", 404);

    if (data.parentResponseId) {
      const parentResponses = await designRepo.getResponse(data.designDrawingsId);
      const validParent = parentResponses.find(
        (res) => res.id === data.parentResponseId
      );
      if (!validParent) throw new AppError("Invalid parent response ID", 400);
    }

    return await designRepo.createResponse(data, userId);
  }

  // ✅ Get all responses for a particular Design Drawing
  async getResponses(id: string) {
    const responses = await designRepo.getResponse(id);
    if (!responses || responses.length === 0)
      throw new AppError("No responses found for this design drawing", 404);
    return responses;
  }

  // ✅ Get a single file object from a Design Drawing or Response
  async getFile(designId: string, fileId: string) {
    const design = await designRepo.findDDById(designId);
    if (!design) throw new AppError("Design Drawing not found", 404);

    const files = design.files as unknown as FileObject[];
    const fileObject = files.find((file) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }
  async getResponseFile(responseId: string, fileId: string) {
    const response = await designRepo.getResponseById(responseId);
    if (!response) throw new AppError("Response not found", 404);

    const files = response.files as unknown as FileObject[];
    const fileObject = files.find((file) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  // ✅ Stream a file from server to client
  async viewFile(id: string, fileId: string, res: Response) {
    const design = await designRepo.findDDById(id);
    if (!design) throw new AppError("Design Drawing not found", 404);

    const files = design.files as unknown as FileObject[];
    const fileObject = files.find((file) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const __dirname = path.resolve();
    const filePath = path.join(__dirname,"public", fileObject.filename);

    return streamFile(res, filePath, fileObject.originalName);
  }
   async viewResponseFile(id: string, fileId: string, res: Response) {
    const response = await designRepo.getResponseById(id);
    if (!response) throw new AppError("Response not found", 404);

    const files = response.files as unknown as FileObject[];
    const fileObject = files.find((file) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, fileObject.path);

    return streamFile(res, filePath, fileObject.originalName);
  }
}
