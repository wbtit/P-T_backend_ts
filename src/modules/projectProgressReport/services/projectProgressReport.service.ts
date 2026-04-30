import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { Response } from "express";
import { FileObject } from "../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import { CreateProjectProgressReportInput,
  UpdateProjectProgressReportInput,
  GetProjectProgressReportInput,
  CreateProjectProgressReportResponseInput,
  UpdateProjectProgressReportResponseInput,
  GetProjectProgressReportResponseInput
} from "../dtos";
import { ProjectProgressReportRepository,
  ProjectProgressReportResponseRepository
} from "../repositories";

const projectProgressReportRepository = new ProjectProgressReportRepository();
const projectProgressReportResponseRepository = new ProjectProgressReportResponseRepository();

export class ProjectProgressReportService {
  async create(data: CreateProjectProgressReportInput, createdById: string) {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project || project.isDeleted) {
      throw new AppError("Project not found", 404);
    }

    const report = await projectProgressReportRepository.create(data, createdById);
    return report;
  }

  async update(data: UpdateProjectProgressReportInput, id: string) {
    const existing = await projectProgressReportRepository.get({ id });

    if (!existing) {
      throw new AppError("Progress report not found", 404);
    }

    const report = await projectProgressReportRepository.update(id, data);
    return report;
  }

  async get(data: GetProjectProgressReportInput) {
    const report = await projectProgressReportRepository.get(data);

    if (!report) {
      throw new AppError("Progress report not found", 404);
    }

    return report;
  }

  async delete(id: string) {
    const existing = await projectProgressReportRepository.get({ id });

    if (!existing) {
      throw new AppError("Progress report not found", 404);
    }

    const report = await projectProgressReportRepository.delete(id);
    return report;
  }

  async getByProjectId(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const reports = await projectProgressReportRepository.getByProjectId(projectId);
    return reports;
  }

  async getAll() {
    const reports = await projectProgressReportRepository.getAll();
    return reports;
  }

  async createResponse(data: CreateProjectProgressReportResponseInput, userId: string) {
    const report = await projectProgressReportRepository.get({ id: data.reportId });

    if (!report) {
      throw new AppError("Progress report not found", 404);
    }

    if (data.parentResponseId) {
      const parentResponse = await projectProgressReportResponseRepository.get({
        id: data.parentResponseId,
      });

      if (!parentResponse) {
        throw new AppError("Parent response not found", 404);
      }

      if (parentResponse.reportId !== data.reportId) {
        throw new AppError("Parent response does not belong to this report", 400);
      }
    }

    const response = await projectProgressReportResponseRepository.create(data, userId);
    return response;
  }

  async updateResponse(data: UpdateProjectProgressReportResponseInput, id: string, userId: string) {
    const response = await projectProgressReportResponseRepository.update(id, data, userId);
    return response;
  }

  async getResponse(data: GetProjectProgressReportResponseInput) {
    const response = await projectProgressReportResponseRepository.get(data);

    if (!response) {
      throw new AppError("Response not found", 404);
    }

    return response;
  }

  async deleteResponse(id: string, userId: string) {
    const response = await projectProgressReportResponseRepository.delete(id, userId);
    return response;
  }

  async getResponsesByReportId(reportId: string) {
    const responses = await projectProgressReportResponseRepository.getByReportId(reportId);
    return responses;
  }

  async getFile(reportId: string, fileId: string) {
    const report = await projectProgressReportRepository.get({ id: reportId });

    if (!report) {
      throw new AppError("Progress report not found", 404);
    }

    const files = (report.files || []) as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file) => file.id === cleanFileId);

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    return fileObject;
  }

  async viewFile(reportId: string, fileId: string, res: Response) {
    const fileObject = await this.getFile(reportId, fileId);
    const filePath = resolveUploadFilePath(fileObject);

    if (!filePath) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }

  async getResponseFile(responseId: string, fileId: string) {
    const response = await projectProgressReportResponseRepository.get({ id: responseId });

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
