import { CORepository, ChangeOrderVersionRepository } from "../repositories";
import {
  CreateCoInput,
  UpdateCoInput,
  CreateCOTableInput,
  CotableRowInput,
} from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { Response } from "express";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";

const corepo = new CORepository();
const versionRepo = new ChangeOrderVersionRepository();

export class COService {
  // Create a new Change Order
  async createCo(data: CreateCoInput, userId: string) {
    const cuurUser= await prisma.user.findUnique({
      where:{id:userId}
    })
    let co;
    const approval = (cuurUser?.role==="ADMIN" || cuurUser?.role==="PROJECT_MANAGER");
    co = await corepo.create(data, userId, approval);

    // 🔑 Create initial version (v1)
    await versionRepo.createInitialVersion(
      co.id,
      {
        description: data.description,
        remarks: data.remarks,
        files: co.files as Prisma.InputJsonValue,
      },
      userId
    );

    return co;
  }

  // Create New Version
  async createNewVersion(
    coId: string,
    data: { description: string; remarks?: string; files?: any },
    userId: string
  ) {
    const existing = await corepo.findById(coId);
    if (!existing) throw new AppError("Change Order not found", 404);

    return versionRepo.createNewVersion(coId, data, userId);
  }

  // Update existing Change Order
  async updateCo(id: string, data: UpdateCoInput, userId: string) {

    if(!data.project){
        throw new AppError("Project ID is required for update", 400);
    }
    const existing = await corepo.findById(id);
    if (!existing) throw new AppError("Change Order not found", 404);

    const updated = await corepo.update(id, data);

    // 🔑 Automatically bump version on update
    await versionRepo.createNewVersion(
      id,
      {
        description: data.description || existing.description,
        remarks: data.remarks || existing.remarks,
        files: updated.files as Prisma.InputJsonValue,
      },
      userId
    );

    return updated;
  }

  async pendingCOsForClientAdmin(userId:string){
    return await corepo.findPendingCOsForClientAdmin(userId);
  }

  async pendingCOsForClient (userId:string){
    return await corepo.findPendingCOsForClient(userId);
  }
  // Get all COs sent by a user
  async sentCos(userId: string, projectId?: string) {
    return await corepo.sentCos(userId, projectId);
  }

  // Get all COs received by a user (approved ones)
  async receivedCos(userId: string, projectId?: string) {
    return await corepo.recivedCos(userId, projectId);
  }

  // Get all COs for a project
  async getByProjectId(projectId: string) {
    const cos = await corepo.getByProjectId(projectId);
    if (!cos || cos.length === 0)
      throw new AppError("No Change Orders found for this project", 404);

    return cos;
  }
  async findById(id:string){
    const co= await corepo.findById(id);
    if(!co) throw new AppError("Change Order not found", 404);
    return co;
  }


  // ------------------ CO Table Operations ------------------

  // Create multiple CO table rows
  async createCoTable(data: CreateCOTableInput, coId: string, userId: string, changeOrderVersionId?: string) {
    if (!data)
      throw new AppError("CO Table data cannot be empty", 400);

    return await corepo.createCoTable(data, coId, userId, changeOrderVersionId);
  }

  // Update single CO table row
  async updateCoTableRow(data: CotableRowInput, id: string, userId: string) {
    const updatedRow = await corepo.updateCoTableRow(data, id, userId);
    if (!updatedRow) throw new AppError("CO Table row not found", 404);
    return updatedRow;
  }

  async replaceCoTable(data: CreateCOTableInput, coId: string, userId: string, changeOrderVersionId?: string) {
    return await corepo.replaceCoTableByCoId(data, coId, userId, changeOrderVersionId);
  }

  // Get all CO table rows for a CO ID
  async getCoTableByCoId(CoId: string, userId: string, changeOrderVersionId?: string) {
    const coRows = await corepo.getCoTableByCoId(CoId, userId, changeOrderVersionId);
    if (!coRows || coRows.length === 0)
      throw new AppError("No CO Table rows found for this CO", 404);

    return coRows;
  }

  // ------------------ File Handling ------------------

  async getFile(coId: string, fileId: string, versionId?: string) {
    const co = await corepo.findById(coId);
    if (!co) throw new AppError("Change Order not found", 404);

    let files: FileObject[] = [];
    if (versionId) {
      const version = co.versions.find((v: any) => v.id === versionId);
      if (!version) throw new AppError("Version not found", 404);
      files = (version.files as unknown as FileObject[]) || [];
    } else {
      files = (co.files as unknown as FileObject[]) || [];
    }

    const fileObject = files.find((file: FileObject) => file.id === fileId);

    if (!fileObject) throw new AppError("File not found", 404);
    return fileObject;
  }

  async viewFile(coId: string, fileId: string, res: Response, versionId?: string) {
    const co = await corepo.findById(coId);
    if (!co) throw new AppError("Change Order not found", 404);

    let files: FileObject[] = [];
    if (versionId) {
      const version = co.versions.find((v: any) => v.id === versionId);
      if (!version) throw new AppError("Version not found", 404);
      files = (version.files as unknown as FileObject[]) || [];
    } else {
      files = (co.files as unknown as FileObject[]) || [];
    }

    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);

    if (!fileObject) throw new AppError("File not found", 404);

    const filePath = resolveUploadFilePath(fileObject);
    if (!filePath) throw new AppError("File not found on server", 404);
    return streamFile(res, filePath, fileObject.originalName);
  }


  async pendingCOs(){
    return await corepo.pendingCOs();
  }

  async pendingCOsForProjectManager(managerId: string) {
    return await corepo.findPendingCOsForProjectManager(managerId);
  }

  async newCOsForProjectManager(managerId: string) {
    return await corepo.findNewCOsForProjectManager(managerId);
  }
}
