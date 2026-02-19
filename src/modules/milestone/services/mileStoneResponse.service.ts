import { Response } from "express";
import path from "path";
import fs from "fs";
import { MileStoneResponse, mileStoneResponseStatus } from "@prisma/client";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { streamFile } from "../../../utils/fileUtil";
import { CreateMileStoneResponseDto } from "../dtos";
import {
  MileStoneRepository,
  MileStoneResponseRepository,
} from "../repositories";

const mileStoneRepo = new MileStoneRepository();
const responseRepo = new MileStoneResponseRepository();

export class MileStoneResponseService {
  async createResponse(data: CreateMileStoneResponseDto, userId: string) {
    const mileStone = await mileStoneRepo.getById(data.mileStoneId);
    if (!mileStone) {
      throw new AppError("MileStone not found", 404);
    }

    if (!data.mileStoneVersionId) {
      throw new AppError("mileStoneVersionId is required to create a response", 400);
    }

    if (mileStone.currentVersionId !== data.mileStoneVersionId) {
      throw new AppError(
        "Responses are allowed only on the latest milestone version",
        400
      );
    }

    if (data.parentResponseId) {
      await responseRepo.updateWorkflowStatus(data.parentResponseId, "ON_TIME");
    }

    return responseRepo.create(data, userId);
  }

  async updateStatus(
    parentResponseId: string,
    status: mileStoneResponseStatus
  ) {
    if (!parentResponseId) {
      throw new AppError("parentResponseId is required", 400);
    }
    return responseRepo.updateWorkflowStatus(parentResponseId, status);
  }

  async getResponseById(id: string) {
    const existing = await responseRepo.getById(id);
    if (!existing) {
      throw new AppError("MileStone response not found", 404);
    }

    return {
      ...existing,
      childResponses: Array.isArray(existing.childResponses)
        ? existing.childResponses.filter(
            (resp: MileStoneResponse) => resp.parentResponseId === null
          )
        : [],
    };
  }

  async viewFile(responseId: string, fileId: string, res: Response) {
    const response = await responseRepo.getById(responseId);
    if (!response) {
      throw new AppError("Response not found", 404);
    }

    const files = response.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, "public", fileObject.path);
    if (!fs.existsSync(filePath)) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }
}
