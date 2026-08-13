import { State, SubResStatus } from "@prisma/client";
import prisma from "../../../config/database/client";
import { CreateSubmittalsResponseDto } from "../dtos";

export class SubmittalResponseRepository {

  // ----------------------------------
  // UPDATE WORKFLOW STATUS (THREAD)
  // ----------------------------------
  async updateWorkflowStatus(
    parentResponseId: string,
    status: SubResStatus
  ) {
    if (!parentResponseId) return null;

    return prisma.submittalsResponse.update({
      where: { id: parentResponseId },
      data: {
        status,
      },
    });
  }

  // ----------------------------------
  // CREATE RESPONSE (VERSION-AWARE)
  // ----------------------------------
  async create(
    data: CreateSubmittalsResponseDto,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Create the response
      const response = await tx.submittalsResponse.create({
        data: {
          reason: data.reason || "",
          description: data.description || "",
          files: data.files,
          status: data.status,
          wbtStatus: data.wbtStatus,

          submittalsId: data.submittalsId,
          submittalVersionId: data.submittalVersionId ?? null,

          userId,
          parentResponseId: data.parentResponseId ?? null,
        },
      });

      // 2. Update the parent submittal's clientResponseStatus to reflect this latest response
      await tx.submittals.update({
        where: { id: data.submittalsId },
        data: { clientResponseStatus: data.status },
      });

      return response;
    });
  }

  // ----------------------------------
  // GET RESPONSE BY ID
  // ----------------------------------
  async getById(id: string) {
    return prisma.submittalsResponse.findUnique({
      where: { id },
      include: {
        childResponses: true,
        submittalVersion: {
          select: {
            id: true,
            versionNumber: true,
            isActive: true,
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
