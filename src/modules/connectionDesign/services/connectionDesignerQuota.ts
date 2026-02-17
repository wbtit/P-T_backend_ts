import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { Response } from "express";
import path from "path";
import fs from "fs";
import { streamFile } from "../../../utils/fileUtil";
import prisma from "../../../config/database/client";
import {
  generateParentScopedSerial,
  extractProjectToken,
  SERIAL_PREFIX,
} from "../../../utils/serial.util";

import {
  CreateConnectionDesignerQuotaInput,
  UpdateConnectionDesignerQuotaInput,
  GetConnectionDesignerQuotaInput,
  DeleteConnectionDesignerQuotaInput,
} from "../dtos";

import { ConnectionDesignerQuotaRepository } from "../repositories";

const quotaRepo = new ConnectionDesignerQuotaRepository();

export class ConnectionDesignerQuotaService {
  // -----------------------------------------------------------------------
  // Create Quota
  // -----------------------------------------------------------------------
  async createQuota(data: CreateConnectionDesignerQuotaInput) {
    if (!data.estimatedHours) {
      throw new AppError("estimatedHours is required", 400);
    }
    if (!data.rfqId) {
      throw new AppError("rfqId is required for quota serial generation", 400);
    }

    // Prevent duplicate quota for same Connection Designer & RFQ
    if (data.connectionDesignerId && data.rfqId) {
      const existing = await quotaRepo.findByDesignerId(data.connectionDesignerId);

      const duplicate = existing.find(q => q.rfqId === data.rfqId);
      if (duplicate) {
        throw new AppError(
          "Quota already exists for this Connection Designer and RFQ",
          409
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const rfq = await tx.rFQ.findUnique({
        where: { id: data.rfqId! },
        select: { id: true, serialNo: true },
      });

      if (!rfq?.serialNo) {
        throw new AppError("RFQ serial number is required before creating quota", 400);
      }

      const serialNo = await generateParentScopedSerial(tx, {
        childPrefix: SERIAL_PREFIX.CONNECTION_DESIGNER_QUOTA,
        parentPrefix: SERIAL_PREFIX.RFQ,
        parentScopeId: rfq.id,
        parentSerialNo: rfq.serialNo,
        projectToken: extractProjectToken(rfq.serialNo),
      });

      return quotaRepo.createWithTx(tx, {
        ...data,
        serialNo,
      });
    });
  }

  // -----------------------------------------------------------------------
  // Get All
  // -----------------------------------------------------------------------
  async getAllQuotas() {
    return quotaRepo.findAll();
  }

  // -----------------------------------------------------------------------
  // Get By ID
  // -----------------------------------------------------------------------
  async getQuotaById(input: GetConnectionDesignerQuotaInput) {
    const quota = await quotaRepo.findById(input);
    if (!quota) throw new AppError("Connection Designer Quota not found", 404);
    return quota;
  }

  // -----------------------------------------------------------------------
  // Get Quotas by Designer ID
  // -----------------------------------------------------------------------
  async getQuotasByDesignerId(designerId: string) {
    return quotaRepo.findByDesignerId(designerId);
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------
  async updateQuota(
    input: GetConnectionDesignerQuotaInput,
    data: UpdateConnectionDesignerQuotaInput
  ) {
    const existing = await quotaRepo.findById(input);
    if (!existing) throw new AppError("Connection Designer Quota not found", 404);

    // If updating RFQ or Designer → ensure no duplicates
    if ((data.connectionDesignerId || data.rfqId) && existing) {
      const quotas = await quotaRepo.findByDesignerId(
        data.connectionDesignerId ?? existing.connectionDesignerId
      );

      const conflict = quotas.find(
        (q) => q.rfqId === (data.rfqId ?? existing.rfqId) && q.id !== existing.id
      );

      if (conflict) {
        throw new AppError(
          "Another quota already exists for this Connection Designer and RFQ",
          409
        );
      }
    }

    const updated = await quotaRepo.update(input, data);
    return updated;
  }

  // -----------------------------------------------------------------------
  // Approve Quota
  // -----------------------------------------------------------------------
  async approveQuota(id: string, approverId: string) {
    const existing = await quotaRepo.findById({ id });
    if (!existing) throw new AppError("Quota not found", 404);

    const updated = await quotaRepo.update(
      { id },
      {
        approvalStatus: true,
        approvalDate: new Date(),
        approvedBy: approverId,
      } as unknown as UpdateConnectionDesignerQuotaInput
    );

    return updated;
  }

  // -----------------------------------------------------------------------
  // Soft Delete
  // -----------------------------------------------------------------------
  async deleteQuota(input: DeleteConnectionDesignerQuotaInput) {
    const existing = await quotaRepo.findById({ id: input.id });
    if (!existing) throw new AppError("Quota not found", 404);

    await quotaRepo.delete(input);
    return { message: "Connection Designer Quota deleted successfully" };
  }

  // -----------------------------------------------------------------------
  // Get File Metadata
  // -----------------------------------------------------------------------
  async getFile(quotaId: string, fileId: string) {
    const quota = await quotaRepo.findById({ id: quotaId });
    if (!quota) throw new AppError("Connection Designer Quota not found", 404);

    const files = quota.files as unknown as FileObject[];
    const fileObject = files?.find((file) => file.id === fileId);

    if (!fileObject) throw new AppError("File not found", 404);
    return fileObject;
  }

  // -----------------------------------------------------------------------
  // View File (Stream)
  // -----------------------------------------------------------------------
  async viewFile(quotaId: string, fileId: string, res: Response) {
    const quota = await quotaRepo.findById({ id: quotaId });
    if (!quota) throw new AppError("Connection Designer Quota not found", 404);

    const files = quota.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files?.find((file) => file.id === cleanFileId);

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
