import { SubmitalRepository,SubmittalVersionRepository } from "../repositories";
import { CreateSubmittalsDto, UpdateSubmittalsDto } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { Response } from "express";
import { streamFile } from "../../../utils/fileUtil";
import fs from "fs";

const submittalRepo = new SubmitalRepository();
const versionRepo = new SubmittalVersionRepository();

export class SubmittalService {

  // ----------------------------------
  // CREATE SUBMITTAL + VERSION v1
  // ----------------------------------
  async createSubmittal(
    data: CreateSubmittalsDto,
    userId: string,
    isAproovedByAdmin: boolean,
    versionData: { description: string; files?: any }
  ) {
    const submittal = await submittalRepo.create(
      data,
      userId,
      isAproovedByAdmin
    );

    // 🔑 create initial version (v1)
    await versionRepo.createInitialVersion(
      submittal.id,
      versionData,
      userId
    );

    return submittal;
  }

  // ----------------------------------
  // UPDATE SUBMITTAL METADATA ONLY
  // ----------------------------------
  async updateSubmittalMetadata(
    id: string,
    data: UpdateSubmittalsDto
  ) {
    const existing = await submittalRepo.findById(id);
    if (!existing) throw new AppError("Submittal not found", 404);

    return submittalRepo.updateMetadata(id, data);
  }

  // ----------------------------------
  // CREATE NEW VERSION (UPDATE CONTENT)
  // ----------------------------------
  async createNewVersion(
    submittalId: string,
    data: { description: string; files?: any },
    userId: string
  ) {
    const existing = await submittalRepo.findById(submittalId);
    if (!existing) throw new AppError("Submittal not found", 404);

    return versionRepo.createNewVersion(
      submittalId,
      data,
      userId
    );
  }

  // ----------------------------------
  // GET SUBMITTAL (WITH FILTERED RESPONSES)
  // ----------------------------------
  async getSubmittalById(id: string) {
    const existing = await submittalRepo.findById(id);
    if (!existing) throw new AppError("Submittal not found", 404);

    return {
      ...existing,
      submittalsResponse: Array.isArray(existing.submittalsResponse)
        ? existing.submittalsResponse.filter(
            resp => resp.parentResponseId === null
          )
        : [],
    };
  }

  async getPendingSubmittals() {
    return submittalRepo.getPendingSubmittals();
  }

  // ----------------------------------
  // LISTS
  // ----------------------------------
  async sent(userId: string) {
    return submittalRepo.sentSubmittals(userId);
  }

  async received(userId: string) {
    return submittalRepo.receivedSubmittals(userId);
  }

  async findByProject(projectId: string) {
    return submittalRepo.findByProject(projectId);
  }

  // ----------------------------------
  // VIEW FILE (VERSION-AWARE + SAFE)
  // ----------------------------------
  async viewFile(
    submittalId: string,
    versionId: string,
    fileId: string,
    res: Response,
    isClient: boolean = false
  ) {
    const submittal = await submittalRepo.findById(submittalId);
    if (!submittal) {
      throw new AppError("Submittal not found", 404);
    }

    const version = submittal.versions.find(v => v.id === versionId);
    if (!version) {
      throw new AppError("Submittal version not found", 404);
    }

    // 🔒 Client can download ONLY latest version
    if (isClient && !version.isActive) {
      throw new AppError(
        "You can download files only from the latest submittal version",
        403
      );
    }

    const files = version.files as unknown as FileObject[];

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
