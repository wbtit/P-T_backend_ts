import path from "path";
import fs from "fs";
import { Response } from "express";

import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";

import {
  CreateVendorInput,
  UpdateVendorInput,
} from "../dto";

import { VendorRepository } from "../repository";
import { streamFile } from "../../../utils/fileUtil";

const vendorRepo = new VendorRepository();

export class VendorService {
  // -------------------------------------------------------------
  // Create
  // -------------------------------------------------------------
  async createVendor(data: CreateVendorInput) {
    const existing = await vendorRepo.findByName(data.name);
    if (existing) {
      throw new AppError("Vendor already exists", 409);
    }

    const vendor = await vendorRepo.create({
      ...data,
      files: data.files ?? [],
      certificates: data.certificates ?? [],
      state: data.state ?? [],
    });

    return vendor;
  }

  // -------------------------------------------------------------
  // Get all
  // -------------------------------------------------------------
  async getAllVendors() {
    return vendorRepo.findAll();
  }

  // -------------------------------------------------------------
  // Get by ID
  // -------------------------------------------------------------
  async getVendorById(id: string) {
    const vendor = await vendorRepo.findById({ id });
    if (!vendor || vendor.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }
    return vendor;
  }

  // -------------------------------------------------------------
  // Update
  // -------------------------------------------------------------
  async updateVendor(
    id: string,
    data: UpdateVendorInput & {
      files?: FileObject[];
      certificates?: FileObject[];
    }
  ) {
    const existing = await vendorRepo.findById({ id });
    if (!existing || existing.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    const existingFiles =
      (existing.files as unknown as FileObject[]) ?? [];
    const newFiles =
      (data.files as unknown as FileObject[]) ?? [];

    const existingCertificates =
      (existing.certificates as unknown as FileObject[]) ?? [];
    const newCertificates =
      (data.certificates as unknown as FileObject[]) ?? [];

    const updated = await vendorRepo.update(
      { id },
      {
        ...data,
        files: [...existingFiles, ...newFiles],
        certificates: [...existingCertificates, ...newCertificates],
      }
    );

    return updated;
  }

  // -------------------------------------------------------------
  // Delete (Soft)
  // -------------------------------------------------------------
  async deleteVendor(id: string) {
    const existing = await vendorRepo.findById({ id });
    if (!existing || existing.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    await vendorRepo.delete({ id });
    return { message: "Vendor deleted successfully" };
  }

  // -------------------------------------------------------------
  // Get File Metadata
  // -------------------------------------------------------------
  async getFile(vendorId: string, fileId: string) {
    const vendor = await vendorRepo.findById({ id: vendorId });
    if (!vendor || vendor.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    const files = vendor.files as unknown as FileObject[];
    const fileObject = files.find((file) => file.id === fileId);

    if (!fileObject) {
      throw new AppError("File not found", 404);
    }

    return fileObject;
  }

  // -------------------------------------------------------------
  // View File (Stream)
  // -------------------------------------------------------------
  async viewFile(vendorId: string, fileId: string, res: Response) {
    const vendor = await vendorRepo.findById({ id: vendorId });
    if (!vendor || vendor.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    const files = vendor.files as unknown as FileObject[];

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
  async deleteFile(vendorId: string, fileId: string) {
    const vendor = await vendorRepo.findById({ id: vendorId });
    if (!vendor || vendor.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    const files = vendor.files as unknown as FileObject[];

    const updatedFiles = files.filter(
      (file) => file.id !== fileId
    );

    return vendorRepo.update(
      { id: vendorId },
      { files: updatedFiles } as unknown as UpdateVendorInput
    );
  }

  // -------------------------------------------------------------
  // Delete Certificate
  // -------------------------------------------------------------
  async deleteCertificate(vendorId: string, certificateId: string) {
    const vendor = await vendorRepo.findById({ id: vendorId });
    if (!vendor || vendor.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    const certificates =
      vendor.certificates as unknown as FileObject[];

    const updatedCertificates = certificates.filter(
      (cert) => cert.id !== certificateId
    );

    return vendorRepo.update(
      { id: vendorId },
      { certificates: updatedCertificates } as unknown as UpdateVendorInput
    );
  }
}
