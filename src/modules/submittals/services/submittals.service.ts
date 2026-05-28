import { SubmitalRepository,SubmittalVersionRepository } from "../repositories";
import { CreateSubmittalsDto, UpdateSubmittalsDto } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { computeSubmittalStatus } from "../utils/statusHelper";
import { UserRole } from "@prisma/client";
import { FileObject } from "../../../shared/fileType";
import { Response } from "express";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";

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
    data: { description: string; files?: any; multipleRecipients?: string[] },
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

  async getClientSidePendingSubmittals(role?: UserRole) {
    const list = await submittalRepo.getClientSidePendingSubmittals(role);
    return list.map(item => computeSubmittalStatus(item));
  }

  async getPendingSubmittalsForClientAdmin(userId:string, role?: UserRole){
    const list = await submittalRepo.getPendingSubmittalsForClientAdmin(userId, role);
    return list.map(item => computeSubmittalStatus(item));
  }

  async getPendingSubmittalsForClient(userId:string, role?: UserRole){
    const list = await submittalRepo.getPendingSubmittalsForClient(userId, role);
    return list.map(item => computeSubmittalStatus(item));
  }

  async getPendingSubmittalsForProjectManager(userId: string, role?: UserRole) {
    const list = await submittalRepo.getPendingSubmittalsForProjectManager(userId, role);
    return list.map(item => computeSubmittalStatus(item));
  }

  async getPendingSubmittalsForDepartmentManager(userId: string, role?: UserRole) {
    const list = await submittalRepo.getPendingSubmittalsForDepartmentManager(userId, role);
    return list.map(item => computeSubmittalStatus(item));
  }

  // ----------------------------------
  // GET SUBMITTAL (WITH FILTERED RESPONSES)
  // ----------------------------------
  async getSubmittalById(id: string, role?: UserRole) {
    const existing = await submittalRepo.findById(id);
    if (!existing) throw new AppError("Submittal not found", 404);

    return computeSubmittalStatus({
      ...existing,
      mileStones: Array.isArray((existing as any).mileStoneLinks) && (existing as any).mileStoneLinks.length > 0
        ? (existing as any).mileStoneLinks.map((link: any) => link.mileStone)
        : ((existing as any).mileStoneBelongsTo ? [(existing as any).mileStoneBelongsTo] : []),
      submittalsResponse: Array.isArray(existing.submittalsResponse)
        ? existing.submittalsResponse.filter(
            resp => resp.parentResponseId === null
          )
        : [],
    });
  }

  async getPendingSubmittals(role?: UserRole) {
    const list = await submittalRepo.getPendingSubmittals(role);
    return list.map(item => computeSubmittalStatus(item));
  }

  // ----------------------------------
  // LISTS
  // ----------------------------------
  async sent(userId: string, projectId?: string, role?: UserRole) {
    const list = await submittalRepo.sentSubmittals(userId, projectId, role);
    return list.map(item => computeSubmittalStatus(item));
  }

  async received(userId: string, projectId?: string, role?: UserRole) {
    const list = await submittalRepo.receivedSubmittals(userId, projectId, role);
    return list.map(item => computeSubmittalStatus(item));
  }

  async findByProject(projectId: string, role?: UserRole) {
    const list = await submittalRepo.findByProject(projectId, role);
    return list.map(item => computeSubmittalStatus(item));
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
    console.log("version files:", version.files);
    const files = version.files as unknown as FileObject[];

    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find(
      (file: FileObject) => file.id === cleanFileId
    );

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    const filePath = resolveUploadFilePath(fileObject);
    console.log("📁 [viewFile] Resolved file path:", filePath);

    if (!filePath) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }
}
