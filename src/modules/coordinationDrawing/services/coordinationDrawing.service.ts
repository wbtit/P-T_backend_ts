import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { Response } from "express";
import { FileObject } from "../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import { CreateCoordinationDrawingInput,
  UpdateCoordinationDrawingInput,
  GetCoordinationDrawingInput,
  CreateCoordinationDrawingResponseInput,
  UpdateCoordinationDrawingResponseInput,
  GetCoordinationDrawingResponseInput
} from "../dtos";
import { CoordinationDrawingRepository,
  CoordinationDrawingResponseRepository
} from "../repositories";

const coordinationDrawingRepository = new CoordinationDrawingRepository();
const coordinationDrawingResponseRepository = new CoordinationDrawingResponseRepository();

export class CoordinationDrawingService {
  async create(data: CreateCoordinationDrawingInput, createdById: string) {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project || project.isDeleted) {
      throw new AppError("Project not found", 404);
    }

    const report = await coordinationDrawingRepository.create(data, createdById);
    return report;
  }

  async update(data: UpdateCoordinationDrawingInput, id: string) {
    const existing = await coordinationDrawingRepository.get({ id });

    if (!existing) {
      throw new AppError("Coordination drawing not found", 404);
    }

    const report = await coordinationDrawingRepository.update(id, data);
    return report;
  }

  async get(data: GetCoordinationDrawingInput) {
    const report = await coordinationDrawingRepository.get(data);

    if (!report) {
      throw new AppError("Coordination drawing not found", 404);
    }

    return report;
  }

  async delete(id: string) {
    const existing = await coordinationDrawingRepository.get({ id });

    if (!existing) {
      throw new AppError("Coordination drawing not found", 404);
    }

    const report = await coordinationDrawingRepository.delete(id);
    return report;
  }

  async getByProjectId(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const reports = await coordinationDrawingRepository.getByProjectId(projectId);
    return reports;
  }

  async getAll() {
    const reports = await coordinationDrawingRepository.getAll();
    return reports;
  }

  async createResponse(data: CreateCoordinationDrawingResponseInput, userId: string) {
    const report = await coordinationDrawingRepository.get({ id: data.drawingId });

    if (!report) {
      throw new AppError("Coordination drawing not found", 404);
    }

    if (data.parentResponseId) {
      const parentResponse = await coordinationDrawingResponseRepository.get({
        id: data.parentResponseId,
      });

      if (!parentResponse) {
        throw new AppError("Parent response not found", 404);
      }

      if (parentResponse.drawingId !== data.drawingId) {
        throw new AppError("Parent response does not belong to this drawing", 400);
      }
    }

    const response = await coordinationDrawingResponseRepository.create(data, userId);
    return response;
  }

  async updateResponse(data: UpdateCoordinationDrawingResponseInput, id: string, userId: string) {
    const response = await coordinationDrawingResponseRepository.update(id, data, userId);
    return response;
  }

  async getResponse(data: GetCoordinationDrawingResponseInput) {
    const response = await coordinationDrawingResponseRepository.get(data);

    if (!response) {
      throw new AppError("Response not found", 404);
    }

    return response;
  }

  async deleteResponse(id: string, userId: string) {
    const response = await coordinationDrawingResponseRepository.delete(id, userId);
    return response;
  }

  async getResponsesByDrawingId(drawingId: string) {
    const responses = await coordinationDrawingResponseRepository.getByDrawingId(drawingId);
    return responses;
  }

  async getFile(drawingId: string, fileId: string) {
    const report = await coordinationDrawingRepository.get({ id: drawingId });

    if (!report) {
      throw new AppError("Coordination drawing not found", 404);
    }

    const files = (report.files || []) as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file) => file.id === cleanFileId);

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    return fileObject;
  }

  async viewFile(drawingId: string, fileId: string, res: Response) {
    const fileObject = await this.getFile(drawingId, fileId);
    const filePath = resolveUploadFilePath(fileObject);

    if (!filePath) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }

  async getResponseFile(responseId: string, fileId: string) {
    const response = await coordinationDrawingResponseRepository.get({ id: responseId });

    if (!response) {
      throw new AppError("Response not found", 404);
    }

    const files = (response.files || []) as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file) => file.id === cleanFileId);

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    return fileObject;
  }

  async viewResponseFile(responseId: string, fileId: string, res: Response) {
    const fileObject = await this.getResponseFile(responseId, fileId);
    const filePath = resolveUploadFilePath(fileObject);

    if (!filePath) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }
}
