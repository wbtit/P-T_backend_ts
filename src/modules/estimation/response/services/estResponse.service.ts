import { Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { FileObject } from "../../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../../utils/fileUtil";
import {
  CreateEstimationResponseInput,
  GetEstimationResponseByIdInput,
} from "../dtos";
import { EstimationResponseRepository } from "../repositories";
import prisma from "../../../../config/database/client";

export class EstimationResponseService {
  private repository = new EstimationResponseRepository();

  async create(
    estimationId: string,
    userId: string,
    data: CreateEstimationResponseInput
  ) {
    const estimation = await prisma.estimation.findUnique({
      where: { id: estimationId },
      select: { id: true },
    });

    if (!estimation) {
      throw new AppError("Estimation not found", 404);
    }

    if (data.parentResponseId) {
      const parentResponse = await this.repository.getById({ id: data.parentResponseId });
      if (!parentResponse || parentResponse.estimationId !== estimationId) {
        throw new AppError("Invalid parent response ID", 400);
      }
    }

    return await this.repository.create(estimationId, userId, data);
  }

  async getById(params: GetEstimationResponseByIdInput) {
    return await this.repository.getById(params);
  }

  async getFile(estimationResId: string, fileId: string) {
    const estimationRes = await this.repository.getById({ id: estimationResId });
    if (!estimationRes) throw new AppError("Estimation response not found", 404);

    const files = estimationRes.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(estimationResId: string, fileId: string, res: Response) {
    const estimationRes = await this.repository.getById({ id: estimationResId });
    if (!estimationRes) throw new AppError("Estimation response not found", 404);

    const files = estimationRes.files as unknown as FileObject[];
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
