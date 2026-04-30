import prisma from "../../../config/database/client";
import { CreateProjectProgressReportResponseInput,
  UpdateProjectProgressReportResponseInput,
  GetProjectProgressReportResponseInput
} from "../dtos";

export class ProjectProgressReportResponseRepository {
  async create(data: CreateProjectProgressReportResponseInput, userId: string) {
    return prisma.projectProgressReportResponse.create({
      data: {
        reportId: data.reportId,
        userId,
        parentResponseId: data.parentResponseId || null,
        description: data.description,
        status: data.status || "SUBMITTED",
        wbtStatus: data.wbtStatus || "SUBMITTED",
        files: data.files || [],
      },
      include: {
        user: true,
        report: { select: { id: true, title: true, projectId: true } },
        childResponses: { include: { user: true } },
      },
    });
  }

  async update(id: string, data: UpdateProjectProgressReportResponseInput, userId: string) {
    const existing = await prisma.projectProgressReportResponse.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      throw new Error("Response not found");
    }

    if (existing.userId !== userId) {
      throw new Error("You can only update your own responses");
    }

    const { reportId: _ignoredReportId, parentResponseId: _ignoredParentId, ...updateData } = data as any;

    return prisma.projectProgressReportResponse.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        report: { select: { id: true, title: true, projectId: true } },
        childResponses: { include: { user: true } },
      },
    });
  }

  async get(data: GetProjectProgressReportResponseInput) {
    return prisma.projectProgressReportResponse.findUnique({
      where: { id: data.id, isDeleted: false },
      include: {
        user: true,
        report: { select: { id: true, title: true, projectId: true } },
        parentResponse: { include: { user: true } },
        childResponses: { include: { user: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.projectProgressReportResponse.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Response not found");
    }

    if (existing.userId !== userId) {
      throw new Error("You can only delete your own responses");
    }

    return prisma.projectProgressReportResponse.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getByReportId(reportId: string) {
    return prisma.projectProgressReportResponse.findMany({
      where: { reportId, isDeleted: false },
      include: {
        user: true,
        childResponses: { include: { user: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}