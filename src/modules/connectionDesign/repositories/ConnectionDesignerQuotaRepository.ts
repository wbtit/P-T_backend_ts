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
    return prisma.connectionDesignerQuota.create({
      data: {
        ...data,
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
    return prisma.connectionDesignerQuota.update({
      where: { id: input.id },
      data: {
        bidprice: data.bidprice,
        estimatedHours: data.estimatedHours,
        weeks: data.weeks,
        approvalStatus: data.approvalStatus ?? false,
        approvalDate: data.approvalDate ?? null,
        rfqId: data.rfqId ?? null,
        connectionDesignerId: data.connectionDesignerId ?? undefined,
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
