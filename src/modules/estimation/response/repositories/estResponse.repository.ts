import prisma from "../../../../config/database/client";
import {
  CreateEstimationResponseInput,
  GetEstimationResponseByIdInput,
} from "../dtos";

export class EstimationResponseRepository {
  async create(
    estimationId: string,
    userId: string,
    data: CreateEstimationResponseInput
  ) {
    return await prisma.estimationResponse.create({
      data: {
        estimationId,
        userId,
        message: data.message,
        files: data.files,
        parentResponseId: data.parentResponseId ?? null,
      },
      include: {
        estimation: true,
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

  async getById(params: GetEstimationResponseByIdInput) {
    return await prisma.estimationResponse.findUnique({
      where: { id: params.id },
      include: {
        parentResponse: true,
        childResponses: true,
        estimation: true,
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
