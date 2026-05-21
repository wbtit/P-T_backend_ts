import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import {
  CreateInvoiceWireTransferInput,
  UpdateInvoiceWireTransferInput,
  GetInvoiceWireTransferInput,
} from "../dtos";
import { InvoiceWireTransferRepository } from "../repositories";
import { FileObject } from "../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import { Response } from "express";

const repository = new InvoiceWireTransferRepository();

export class InvoiceWireTransferService {
  async create(data: CreateInvoiceWireTransferInput, userId: string) {
    const result = await repository.create(data, userId);
    return result;
  }

  async update(id: string, data: UpdateInvoiceWireTransferInput) {
    const existing = await repository.get({ id });
    if (!existing) {
      throw new AppError("Invoice wire transfer not found", 404);
    }
    const result = await repository.update(id, data);
    return result;
  }

  async get(data: GetInvoiceWireTransferInput) {
    const result = await repository.get(data);
    if (!result) {
      throw new AppError("Invoice wire transfer not found", 404);
    }
    return result;
  }

  async delete(id: string) {
    const existing = await repository.get({ id });
    if (!existing) {
      throw new AppError("Invoice wire transfer not found", 404);
    }
    const result = await repository.delete(id);
    return result;
  }

  async getAll() {
    return repository.getAll();
  }

  async getByInvoiceId(invoiceId: string) {
    return repository.getByInvoiceId(invoiceId);
  }

  async getByCreatedBy(userId: string) {
    return repository.getByCreatedBy(userId);
  }

  async getFile(id: string, fileId: string) {
    const record = await repository.get({ id });
    if (!record) throw new AppError("Invoice wire transfer not found", 404);

    const files = record.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(id: string, fileId: string, res: Response) {
    const record = await repository.get({ id });
    if (!record) throw new AppError("Invoice wire transfer not found", 404);

    const files = record.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    const filePath = resolveUploadFilePath(fileObject);
    if (!filePath) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }
}
