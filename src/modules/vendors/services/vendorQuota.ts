import { AppError } from "../../../config/utils/AppError";
import prisma from "../../../config/database/client";
import {
  extractProjectToken,
  generateParentScopedSerial,
  SERIAL_PREFIX,
} from "../../../utils/serial.util";

import {
  CreateVendorQuotaInput,
  UpdateVendorQuotaInput,
  GetVendorQuotaInput,
  DeleteVendorQuotaInput,
} from "../dto";

import { VendorQuotaRepository } from "../repository";

const quotaRepo = new VendorQuotaRepository();

export class VendorQuotaService {
  // -----------------------------------------------------------------------
  // Create Quota
  // -----------------------------------------------------------------------
  async createQuota(data: CreateVendorQuotaInput) {
    if (!data.rfqId) {
      throw new AppError("rfqId is required for quota serial generation", 400);
    }
    // Prevent duplicate quota for same Vendor & RFQ
    if (data.vendorId && data.rfqId) {
      const existing = await quotaRepo.findByVendorId(data.vendorId);

      const duplicate = existing.find(
        (q) => q.rfqId === data.rfqId
      );

      if (duplicate) {
        throw new AppError(
          "Quota already exists for this Vendor and RFQ",
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
        childPrefix: SERIAL_PREFIX.VENDOR_QUOTA,
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
  async getQuotaById(input: GetVendorQuotaInput) {
    const quota = await quotaRepo.findById(input);
    if (!quota || quota.isDeleted) {
      throw new AppError("Vendor Quota not found", 404);
    }
    return quota;
  }

  // -----------------------------------------------------------------------
  // Get Quotas by Vendor ID
  // -----------------------------------------------------------------------
  async getQuotasByVendorId(vendorId: string) {
    return quotaRepo.findByVendorId(vendorId);
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------
  async updateQuota(
    input: GetVendorQuotaInput,
    data: UpdateVendorQuotaInput
  ) {
    const existing = await quotaRepo.findById(input);
    if (!existing || existing.isDeleted) {
      throw new AppError("Vendor Quota not found", 404);
    }

    // Prevent duplicate Vendor + RFQ combination
    if ((data.vendorId || data.rfqId) && existing) {
      const quotas = await quotaRepo.findByVendorId(
        data.vendorId ?? existing.vendorId
      );

      const conflict = quotas.find(
        (q) =>
          q.rfqId === (data.rfqId ?? existing.rfqId) &&
          q.id !== existing.id
      );

      if (conflict) {
        throw new AppError(
          "Another quota already exists for this Vendor and RFQ",
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
    if (!existing || existing.isDeleted) {
      throw new AppError("Vendor Quota not found", 404);
    }

    const updated = await quotaRepo.update(
      { id },
      {
        approvalStatus: true,
        approvalDate: new Date(),
        approvedBy: approverId,
      } as unknown as UpdateVendorQuotaInput
    );

    return updated;
  }

  // -----------------------------------------------------------------------
  // Soft Delete
  // -----------------------------------------------------------------------
  async deleteQuota(input: DeleteVendorQuotaInput) {
    const existing = await quotaRepo.findById({ id: input.id });
    if (!existing || existing.isDeleted) {
      throw new AppError("Vendor Quota not found", 404);
    }

    await quotaRepo.delete(input);

    return { message: "Vendor Quota deleted successfully" };
  }
}
