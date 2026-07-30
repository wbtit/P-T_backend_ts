import {
  CreateFabricatorInput,
  UpdateFabricatorInput,
  GetFabricatorInput,
  DeleteFabricatorInput,
} from "../dtos";

import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import { paginate, PaginationQuery } from "../../../utils/pagination";

// Shared include block — avoids repeating the same 4 relations in every query
const FABRICATOR_INCLUDE = {
  branches: true,
  project: true,
  pointOfContact: true,
  wbtFabricatorPointOfContact: true,
} as const;

export class FabricatorRepository {
  async create(data: CreateFabricatorInput, userId: string) {
    const { pointOfContact, wbtFabricatorPointOfContact, ...safeData } = data;

    return prisma.fabricator.create({
      data: {
        ...safeData,
        createdById: userId,
        pointOfContact: pointOfContact?.length
          ? { connect: pointOfContact.map((id) => ({ id })) }
          : undefined,
        wbtFabricatorPointOfContact: wbtFabricatorPointOfContact?.length
          ? { connect: wbtFabricatorPointOfContact.map((id) => ({ id })) }
          : undefined,
      },
      include: FABRICATOR_INCLUDE,
    });
  }

  private buildWhereClause(filters?: { search?: string; stage?: string; contactId?: string }): Prisma.FabricatorWhereInput {
    const whereClause: Prisma.FabricatorWhereInput = { isDeleted: false };
    if (filters?.search) {
      whereClause.fabName = { contains: filters.search, mode: "insensitive" };
    }
    if (filters?.stage) {
      whereClause.fabStage = filters.stage as any;
    }
    if (filters?.contactId) {
      whereClause.wbtFabricatorPointOfContact = { some: { id: filters.contactId } };
    }
    return whereClause;
  }

  async findAll(skip?: number, take?: number, filters?: { search?: string; stage?: string; contactId?: string }) {
    const where = this.buildWhereClause(filters);
    return prisma.fabricator.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: FABRICATOR_INCLUDE,
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
    });
  }

  async countAll(filters?: { search?: string; stage?: string; contactId?: string }) {
    const where = this.buildWhereClause(filters);
    return prisma.fabricator.count({
      where,
    });
  }

  async findAllPaginated(query: PaginationQuery, filters?: { search?: string; stage?: string; contactId?: string }) {
    const where = this.buildWhereClause(filters);
    return paginate(prisma.fabricator, {
      where,
      orderBy: { createdAt: "desc" },
      include: FABRICATOR_INCLUDE
    }, query);
  }

  async findPointOfContacts(fabricatorId: string) {
    const fabricator = await prisma.fabricator.findUnique({
      where: { id: fabricatorId, isDeleted: false },
      select: {
        pointOfContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          }
        },
        wbtFabricatorPointOfContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          }
        }
      }
    });

    return fabricator;
  }

  async findById(input: GetFabricatorInput) {
    return prisma.fabricator.findFirst({
      where: { id: input.id, isDeleted: false },
      include: FABRICATOR_INCLUDE,
    });
  }

  async findByIdHeadquaters(id: string) {
    return await prisma.fabricator.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findByName(fabName: string) {
    return prisma.fabricator.findFirst({
      where: { fabName, isDeleted: false },
      include: FABRICATOR_INCLUDE,
    });
  }

  async findByCreatedById(createdById: GetFabricatorInput) {
    return prisma.fabricator.findMany({
      where: { createdById: createdById.id, isDeleted: false },
      include: FABRICATOR_INCLUDE,
    });
  }

  async update(input: GetFabricatorInput, data: UpdateFabricatorInput) {
    return prisma.fabricator.update({
      where: { id: input.id },
      data: {
        fabName: data.fabName,
        website: data.website ?? null,
        drive: data.drive ?? null,
        SAC: data.SAC?? "",
        fabricatPercentage: data.fabricatPercentage,
        approvalPercentage: data.approvalPercentage,
        paymenTDueDate: data.paymenTDueDate,
        COPerHourPrice: data.COPerHourPrice,
        files: data.files ?? [],
        accountId: data.accountId ?? null,
        currencyType: data.currencyType,
        fabStage: data.fabStage,
        pointOfContact: data.pointOfContact?.length
          ? { connect: data.pointOfContact.map((id) => ({ id })) }
          : undefined,
        wbtFabricatorPointOfContact: data.wbtFabricatorPointOfContact?.length
          ? { connect: data.wbtFabricatorPointOfContact.map((id) => ({ id })) }
          : undefined,
      },
      include: FABRICATOR_INCLUDE,
    });
  }

  async delete(input: DeleteFabricatorInput) {
    return prisma.fabricator.update({
      where: { id: input.id },
      data: { isDeleted: true },
    });
  }
}
