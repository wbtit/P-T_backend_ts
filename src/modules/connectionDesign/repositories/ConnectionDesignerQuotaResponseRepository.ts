import {
  CreateConnectionDesignerQuotaResponseInput,
  UpdateConnectionDesignerQuotaResponseInput,
  GetConnectionDesignerQuotaResponseInput,
  DeleteConnectionDesignerQuotaResponseInput
} from "../dtos/connectionDesignerQuotaResponse.dto";

import prisma from "../../../config/database/client";

export class ConnectionDesignerQuotaResponseRepository {
  async create(data: CreateConnectionDesignerQuotaResponseInput) {
    return prisma.connectionDesignerQuotaResponse.create({
      data: {
        ...data,
      },
      include: {
        childResponses: true,
      },
    });
  }

  async findAll() {
    return prisma.connectionDesignerQuotaResponse.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        childResponses: true,
      },
    });
  }

  async findById(input: GetConnectionDesignerQuotaResponseInput) {
    return prisma.connectionDesignerQuotaResponse.findUnique({
      where: { id: input.id },
      include: {
        childResponses: true,
      },
    });
  }

  async findByQuotaId(quotaId: string) {
    return prisma.connectionDesignerQuotaResponse.findMany({
      where: { quotaId, isDeleted: false },
      include: {
        childResponses: true,
      },
      orderBy: { createdAt: "asc" }
    });
  }

  async update(input: GetConnectionDesignerQuotaResponseInput, data: UpdateConnectionDesignerQuotaResponseInput) {
    return prisma.connectionDesignerQuotaResponse.update({
      where: { id: input.id },
      data: {
        ...data,
      },
      include: {
        childResponses: true,
      },
    });
  }

  async delete(input: DeleteConnectionDesignerQuotaResponseInput) {
    return prisma.connectionDesignerQuotaResponse.update({
      where: { id: input.id },
      data: {
        isDeleted: true,
      },
    });
  }
}
