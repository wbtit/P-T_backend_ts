import { SubmitalRepository, SubmittalResponse } from "../repositories";
import { createSubResDto } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { Response } from "express";
import { streamFile } from "../../../utils/fileUtil";
import { State } from "@prisma/client";
import fs from "fs";

const submittalResponseRepo = new SubmittalResponse();
const submittalRepo = new SubmitalRepository();

export class SubmittalResponseService {
  async createResponse(data: createSubResDto, userId: string) {
    await submittalRepo.update(data.submittalsId, {
      status: false,           // assuming status is boolean
    });
    if(data.parentResponseId!=undefined){
      await submittalResponseRepo.update(data.parentResponseId,"SENT")
    }

    return await submittalResponseRepo.create(data, userId);
  }

  async updateStatus(parentResponseId: string, status: State) {
    if (!parentResponseId) throw new AppError("parentResponseId is required", 400);
    return await submittalResponseRepo.update(parentResponseId, status);
  }

  async getResponseById(id: string) {
    const existing = await submittalResponseRepo.getById(id);
    if (!existing) throw new AppError("Submittal Response not found", 404);

    // ✅ filter out child responses if you want only root-level responses
    const filtered = {
      ...existing,
      childResponses: Array.isArray(existing.childResponses)
        ? existing.childResponses.filter((resp) => resp.parentResponseId === null)
        : [],
    };

    return filtered;
  }

  async getFile(responseId: string, fileId: string) {
    const response = await submittalResponseRepo.getById(responseId);
    if (!response) throw new AppError("Response not found", 404);

    const files = response.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(id: string, fileId: string, res: Response) {
  console.log("📥 [submittalResponse:viewFile] Called with:", { id, fileId });

  const response = await submittalResponseRepo.getById(id);
  if (!response) {
    console.error("❌ [submittalResponse:viewFile] Response not found:", id);
    throw new AppError("Response not found", 404);
  }

  const files = response.files as unknown as FileObject[];

  console.log("📂 [submittalResponse:viewFile] Available files:", files.map(f => ({
    id: f.id,
    path: f.path,
    filename: f.filename,
    originalName: f.originalName,
  })));

  // Remove extension if present (e.g. fileId.pdf → fileId)
  const cleanFileId = fileId.replace(/\.[^/.]+$/, "");

  const fileObject = files.find(
    (file: FileObject) => file.id === cleanFileId
  );

  if (!fileObject) {
    console.warn("⚠️ [submittalResponse:viewFile] File not found in response.files", {
      fileId,
      availableFileIds: files.map(f => f.id),
    });
    throw new AppError("File not found", 404);
  }

  const __dirname = path.resolve();
  const filePath = path.join(__dirname, fileObject.path); // ✅ use path, not filename

  if (!fs.existsSync(filePath)) {
    console.error(
      "🚨 [submittalResponse:viewFile] File does not exist on disk:",
      filePath
    );
    throw new AppError("File not found on server", 404);
  }

  return streamFile(res, filePath, fileObject.originalName);
}

}
