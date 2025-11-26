import { AppError } from "../../../config/utils/AppError";

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

    const quota = await quotaRepo.create(data);
    return quota;
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
}
