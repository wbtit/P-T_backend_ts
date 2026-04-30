import prisma from "../../../config/database/client";
import { CreateCoordinationDrawingInput,
  UpdateCoordinationDrawingInput,
  GetCoordinationDrawingInput
} from "../dtos";

const COORDINATION_DRAWING_RESPONSES_INCLUDE = {
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

const COORDINATION_DRAWING_INCLUDE = {
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

export class CoordinationDrawingRepository {
  async create(data: CreateCoordinationDrawingInput, createdById: string) {
    return prisma.coordinationDrawing.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        message: data.message,
        stage: data.stage || "RFI",
        files: data.files || [],
        createdById,
      },
      include: COORDINATION_DRAWING_INCLUDE,
    });
  }

  async update(id: string, data: UpdateCoordinationDrawingInput) {
    const { projectId: _ignoredProjectId, ...updateData } = data as any;
    return prisma.coordinationDrawing.update({
      where: { id },
      data: updateData,
      include: COORDINATION_DRAWING_INCLUDE,
    });
  }

  async get(data: GetCoordinationDrawingInput) {
    return prisma.coordinationDrawing.findUnique({
      where: { id: data.id },
      include: {
        ...COORDINATION_DRAWING_INCLUDE,
        responses: COORDINATION_DRAWING_RESPONSES_INCLUDE,
      },
    });
  }

  async delete(id: string) {
    return prisma.coordinationDrawing.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getByProjectId(projectId: string) {
    return prisma.coordinationDrawing.findMany({
      where: { projectId, isDeleted: false },
      include: {
        ...COORDINATION_DRAWING_INCLUDE,
        responses: COORDINATION_DRAWING_RESPONSES_INCLUDE,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAll() {
    return prisma.coordinationDrawing.findMany({
      where: { isDeleted: false },
      include: {
        ...COORDINATION_DRAWING_INCLUDE,
        responses: COORDINATION_DRAWING_RESPONSES_INCLUDE,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
