import prisma from "../../../config/database/client";
import { CreateMileStoneResponseDto } from "../dtos";
import { mileStoneResponseStatus } from "@prisma/client";

export class MileStoneResponseRepository {
  async create(data: CreateMileStoneResponseDto, userId: string) {
    return prisma.mileStoneResponse.create({
      data: {
        mileStoneVersionId: data.mileStoneVersionId!,
        parentResponseId: data.parentResponseId ?? null,
        description: data.description ?? "",
        status: data.status ?? "ON_TIME",
        files: data.files,
        userId,
      },
    });
  }

  async updateWorkflowStatus(
    parentResponseId: string,
    status: mileStoneResponseStatus
  ) {
    if (!parentResponseId) return null;

    return prisma.mileStoneResponse.update({
      where: { id: parentResponseId },
      data: { status },
    });
  }

  async getById(id: string) {
    return prisma.mileStoneResponse.findUnique({
      where: { id },
      include: {
        childResponses: true,
        mileStoneVersion: {
          select: {
            id: true,
            versionNumber: true,
            isActive: true,
            mileStoneId: true,
          },
        },
        user: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
