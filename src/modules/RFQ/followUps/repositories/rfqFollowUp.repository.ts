import prisma from "../../../../config/database/client";
import { cleandata } from "../../../../config/utils/cleanDataObject";
import {
  CreateRFQFollowUpInput,
  UpdateRFQFollowUpInput,
} from "../dtos";

export class RFQFollowUpRepository {
  async create(
    rfqId: string,
    createdById: string,
    data: CreateRFQFollowUpInput
  ) {
    const cleanedData = cleandata(data);
    return prisma.rFQFollowUp.create({
      data: {
        ...cleanedData,
        rfqId,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  async getById(id: string) {
    return prisma.rFQFollowUp.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  async getByRfqId(rfqId: string) {
    return prisma.rFQFollowUp.findMany({
      where: { rfqId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: UpdateRFQFollowUpInput) {
    const cleanedData = cleandata(data);
    return prisma.rFQFollowUp.update({
      where: { id },
      data: cleanedData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return prisma.rFQFollowUp.delete({
      where: { id },
    });
  }
}

