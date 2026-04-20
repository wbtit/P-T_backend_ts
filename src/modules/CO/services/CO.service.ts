import { CORepository } from "../repositories";
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

const corepo = new CORepository();

export class COService {
  // Create a new Change Order
  async createCo(data: CreateCoInput, userId: string) {
    const cuurUser= await prisma.user.findUnique({
      where:{id:userId}
    })
    let co;
    if(cuurUser?.role==="ADMIN" || cuurUser?.role==="PROJECT_MANAGER"){
        co = await corepo.create(data, userId,true);
    }else{
        co = await corepo.create(data, userId,false);
    }
    return co;
  }

  // Update existing Change Order
  async updateCo(id: string, data: UpdateCoInput) {

    if(!data.project){
        throw new AppError("Project ID is required for update", 400);
    }
    const existing = await corepo.getByProjectId(data.project);
    if (!existing) throw new AppError("Change Order not found", 404);

    const updated = await corepo.update(id, data);
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
  async createCoTable(data: CreateCOTableInput, coId: string, userId: string) {
    if (!data)
      throw new AppError("CO Table data cannot be empty", 400);

    return await corepo.createCoTable(data, coId, userId);
  }

  // Update single CO table row
  async updateCoTableRow(data: CotableRowInput, id: string, userId: string) {
    const updatedRow = await corepo.updateCoTableRow(data, id, userId);
    if (!updatedRow) throw new AppError("CO Table row not found", 404);
    return updatedRow;
  }

  async replaceCoTable(data: CreateCOTableInput, coId: string, userId: string) {
    return await corepo.replaceCoTableByCoId(data, coId, userId);
  }

  // Get all CO table rows for a CO ID
  async getCoTableByCoId(CoId: string, userId: string) {
    const coRows = await corepo.getCoTableByCoId(CoId, userId);
    if (!coRows || coRows.length === 0)
      throw new AppError("No CO Table rows found for this CO", 404);

    return coRows;
  }

  // ------------------ File Handling ------------------

  async getFile(coId: string, fileId: string) {
    const co = await corepo.findById(coId);
    if (!co) throw new AppError("Change Order not found", 404);

    const files = (co.files as unknown as FileObject[]) || [];
    const fileObject = files.find((file: FileObject) => file.id === fileId);

    if (!fileObject) throw new AppError("File not found", 404);
    return fileObject;
  }

  async viewFile(coId: string, fileId: string, res: Response) {
    const co = await corepo.findById(coId);
    if (!co) throw new AppError("Change Order not found", 404);

    const files = (co.files as unknown as FileObject[]) || [];
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
