import prisma from "../../../config/database/client";
import { CreateProjectProgressReportInput,
  UpdateProjectProgressReportInput,
  GetProjectProgressReportInput
} from "../dtos";

const PROGRESS_REPORT_RESPONSES_INCLUDE = {
  where: {
    parentResponseId: null,
  },
  include: {
    user: true,
    childResponses: {
      include: {
        user: true,
      },
    },
  },
} as const;

const PROGRESS_REPORT_INCLUDE = {
  project: { select: { id: true, name: true, stage: true } },
  createdBy: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
} as const;

export class ProjectProgressReportRepository {
  async create(data: CreateProjectProgressReportInput, createdById: string) {
    return prisma.projectProgressReport.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        message: data.message,
        stage: data.stage || "RFI",
        files: data.files || [],
        createdById,
      },
      include: PROGRESS_REPORT_INCLUDE,
    });
  }

  async update(id: string, data: UpdateProjectProgressReportInput) {
    const { projectId: _ignoredProjectId, ...updateData } = data as any;
    return prisma.projectProgressReport.update({
      where: { id },
      data: updateData,
      include: PROGRESS_REPORT_INCLUDE,
    });
  }

  async get(data: GetProjectProgressReportInput) {
    return prisma.projectProgressReport.findUnique({
      where: { id: data.id },
      include: {
        ...PROGRESS_REPORT_INCLUDE,
        responses: PROGRESS_REPORT_RESPONSES_INCLUDE,
      },
    });
  }

  async delete(id: string) {
    return prisma.projectProgressReport.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getByProjectId(projectId: string) {
    return prisma.projectProgressReport.findMany({
      where: { projectId, isDeleted: false },
      include: {
        ...PROGRESS_REPORT_INCLUDE,
        responses: PROGRESS_REPORT_RESPONSES_INCLUDE,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAll() {
    return prisma.projectProgressReport.findMany({
      where: { isDeleted: false },
      include: {
        ...PROGRESS_REPORT_INCLUDE,
        responses: PROGRESS_REPORT_RESPONSES_INCLUDE,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
