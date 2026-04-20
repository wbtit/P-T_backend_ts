import {
  CreateFabricatorInput,
  UpdateFabricatorInput,
  GetFabricatorInput,
  DeleteFabricatorInput,
} from "../dtos";

import prisma from "../../../config/database/client";

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

  async findAll() {
    return prisma.fabricator.findMany({
      orderBy: { createdAt: "desc" },
      include: FABRICATOR_INCLUDE,
    });
  }

  async findById(input: GetFabricatorInput) {
    return prisma.fabricator.findUnique({
      where: { id: input.id },
      include: FABRICATOR_INCLUDE,
    });
  }

  async findByIdHeadquaters(id: string) {
    return await prisma.fabricator.findFirst({
      where: { id },
    });
  }

  async findByName(fabName: string) {
    return prisma.fabricator.findUnique({
      where: { fabName },
      include: FABRICATOR_INCLUDE,
    });
  }

  async findByCreatedById(createdById: GetFabricatorInput) {
    return prisma.fabricator.findMany({
      where: { createdById: createdById.id },
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
