import { SubmittalResponseRepository } from "../repositories";
import { SubmitalRepository } from "../repositories";
import { CreateSubmittalsResponseDto } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { Response } from "express";
import { streamFile } from "../../../utils/fileUtil";
import { State } from "@prisma/client";
import fs from "fs";

const responseRepo = new SubmittalResponseRepository();
const submittalRepo = new SubmitalRepository();

export class SubmittalResponseService {

  // ----------------------------------
  // CREATE RESPONSE (VERSION-AWARE)
  // ----------------------------------
  async createResponse(
    data: CreateSubmittalsResponseDto,
    userId: string
  ) {
    // 🔒 Validate submittal exists
    const submittal = await submittalRepo.findById(data.submittalsId);
    if (!submittal) {
      throw new AppError("Submittal not found", 404);
    }

    // 🔒 Enforce version reference
    if (!data.submittalVersionId) {
      throw new AppError(
        "submittalVersionId is required to create a response",
        400
      );
    }

    // 🔒 Optional strict check:
    // Only allow responding to the latest version
    if (submittal.currentVersionId !== data.submittalVersionId) {
      throw new AppError(
        "Responses are allowed only on the latest submittal version",
        400
      );
    }

    // 🔁 Update workflow status of parent response (threading)
    if (data.parentResponseId) {
      await responseRepo.updateWorkflowStatus(
        data.parentResponseId,
        State.SENT
      );
    }

    return responseRepo.create(data, userId);
  }

  // ----------------------------------
  // UPDATE WORKFLOW STATUS
  // ----------------------------------
  async updateStatus(
    parentResponseId: string,
    status: State
  ) {
    if (!parentResponseId) {
      throw new AppError("parentResponseId is required", 400);
    }

    return responseRepo.updateWorkflowStatus(
      parentResponseId,
      status
    );
  }

  // ----------------------------------
  // GET RESPONSE BY ID
  // ----------------------------------
  async getResponseById(id: string) {
    const existing = await responseRepo.getById(id);
    if (!existing) {
      throw new AppError("Submittal Response not found", 404);
    }

    return {
      ...existing,
      childResponses: Array.isArray(existing.childResponses)
        ? existing.childResponses.filter(
            resp => resp.parentResponseId === null
          )
        : [],
    };
  }

  // ----------------------------------
  // VIEW RESPONSE FILE
  // ----------------------------------
  async viewFile(
    responseId: string,
    fileId: string,
    res: Response
  ) {
    const response = await responseRepo.getById(responseId);
    if (!response) {
      throw new AppError("Response not found", 404);
    }

    const files = response.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");

    const fileObject = files.find(
      (file: FileObject) => file.id === cleanFileId
    );

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, fileObject.path);

    if (!fs.existsSync(filePath)) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }
}
