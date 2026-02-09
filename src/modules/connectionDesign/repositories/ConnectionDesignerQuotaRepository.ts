import {
  CreateConnectionDesignerQuotaInput,
  UpdateConnectionDesignerQuotaInput,
  GetConnectionDesignerQuotaInput,
  DeleteConnectionDesignerQuotaInput
} from "../dtos";

import prisma from "../../../config/database/client";

export class ConnectionDesignerQuotaRepository {

  // Create quota entry
  async create(data: CreateConnectionDesignerQuotaInput) {
    const { createdById, updatedById, ...safeData } = data as CreateConnectionDesignerQuotaInput & {
      createdById?: string;
      updatedById?: string;
    };
    return prisma.connectionDesignerQuota.create({
      data: {
        ...safeData,
      },
      include: {
        connectionDesigner: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // Get all quotas
  async findAll() {
    return prisma.connectionDesignerQuota.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        connectionDesigner: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // Get by ID
  async findById(input: GetConnectionDesignerQuotaInput) {
    return prisma.connectionDesignerQuota.findUnique({
      where: { id: input.id },
      include: {
        connectionDesigner: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // Get quotas for one connection designer
  async findByDesignerId(designerId: string) {
    return prisma.connectionDesignerQuota.findMany({
      where: { connectionDesignerId: designerId, isDeleted: false },
      include: {
        connectionDesigner: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // Update
  async update(input: GetConnectionDesignerQuotaInput, data: UpdateConnectionDesignerQuotaInput) {
    const { updatedById, createdById, ...safeData } = data as UpdateConnectionDesignerQuotaInput & {
      createdById?: string;
      updatedById?: string;
    };
    return prisma.connectionDesignerQuota.update({
      where: { id: input.id },
      data: {
        bidprice: safeData.bidprice,
        estimatedHours: safeData.estimatedHours,
        weeks: safeData.weeks,
        files: safeData.files ?? undefined,
        approvalStatus: safeData.approvalStatus ?? false,
        approvalDate: safeData.approvalDate ?? null,
        rfqId: safeData.rfqId ?? null,
        connectionDesignerId: safeData.connectionDesignerId ?? undefined,
      },
      include: {
        connectionDesigner: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // Soft delete
  async delete(input: DeleteConnectionDesignerQuotaInput) {
    return prisma.connectionDesignerQuota.update({
      where: { id: input.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
