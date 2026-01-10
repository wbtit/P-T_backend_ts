import path from "path";
import fs from "fs";
import { Response } from "express";

import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";

import {
  CreateConnectionDesignerInput,
  UpdateConnectionDesignerInput,
} from "../dtos";

import { ConnectionDesignerRepository } from "../repositories";
import { streamFile } from "../../../utils/fileUtil";

const cdRepo = new ConnectionDesignerRepository();

export class ConnectionDesignerService {
  // -------------------------------------------------------------
  // Create
  // -------------------------------------------------------------
  async createConnectionDesigner(data: CreateConnectionDesignerInput) {
    const existing = await cdRepo.findByName(data.name);
    if (existing) throw new AppError("Connection Designer already exists", 409);

    const connectionDesigner = await cdRepo.create({
      ...data,
      files: data.files ?? [],
      certificates:data.certificates ?? [],
    });

    return connectionDesigner;
  }

  // -------------------------------------------------------------
  // Get all
  // -------------------------------------------------------------
  async getAllConnectionDesigners() {
    return cdRepo.findAll();
  }

  // -------------------------------------------------------------
  // Get by ID
  // -------------------------------------------------------------
  async getConnectionDesignerById(id: string) {
    return cdRepo.findById({ id });
  }

  // -------------------------------------------------------------
  // Update
  // -------------------------------------------------------------
  async updateConnectionDesigner(
    id: string,
    data: UpdateConnectionDesignerInput & { files?: FileObject[] }
  ) {
    const existing = await cdRepo.findById({ id });
    if (!existing) throw new AppError("Connection Designer not found", 404);

    const existingFiles = (existing.files as unknown as FileObject[]) ?? [];
    const newFiles = (data.files as unknown as FileObject[]) ?? [];

    const updated = await cdRepo.update(
      { id },
      {
        ...data,
        files: [...existingFiles, ...newFiles],
      }
    );

    return updated;
  }

  // -------------------------------------------------------------
  // Delete (Soft)
  // -------------------------------------------------------------
  async deleteConnectionDesigner(id: string) {
    const existing = await cdRepo.findById({ id });
    if (!existing) throw new AppError("Connection Designer not found", 404);

    await cdRepo.delete({ id });
    return { message: "Connection Designer deleted successfully" };
  }

  // -------------------------------------------------------------
  // Get File Metadata
  // -------------------------------------------------------------
  async getFile(designerId: string, fileId: string) {
    const designer = await cdRepo.findById({ id: designerId });
    if (!designer) throw new AppError("Connection Designer not found", 404);

    const files = designer.files as unknown as FileObject[];
    const fileObject = files.find((file) => file.id === fileId);

    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  // -------------------------------------------------------------
  // View File (Stream)
  // -------------------------------------------------------------
  async viewFile(designerId: string, fileId: string, res: Response) {
    const designer = await cdRepo.findById({ id: designerId });
    if (!designer) throw new AppError("Connection Designer not found", 404);

    const files = designer.files as unknown as FileObject[];

    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file) => file.id === cleanFileId);

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

  // -------------------------------------------------------------
  // Delete File
  // -------------------------------------------------------------
  async deleteFile(designerId: string, fileId: string) {
    const designer = await cdRepo.findById({ id: designerId });
    if (!designer) throw new AppError("Connection Designer not found");

    const files = designer.files as unknown as { id: string }[];

    const updatedFiles = files.filter((file) => file.id !== fileId);

    return cdRepo.update(
      { id: designerId },
      { files: updatedFiles } as unknown as UpdateConnectionDesignerInput
    );
  }
}
