import prisma from "../../../config/database/client";
import { CreateCoordinationDrawingResponseInput,
  UpdateCoordinationDrawingResponseInput,
  GetCoordinationDrawingResponseInput
} from "../dtos";

export class CoordinationDrawingResponseRepository {
  async create(data: CreateCoordinationDrawingResponseInput, userId: string) {
    return prisma.coordinationDrawingResponse.create({
      data: {
        drawingId: data.drawingId,
        userId,
        parentResponseId: data.parentResponseId || null,
        description: data.description,
        status: data.status || "SUBMITTED",
        wbtStatus: data.wbtStatus || "SUBMITTED",
        files: data.files || [],
      },
      include: {
        user: true,
        drawing: { select: { id: true, title: true, projectId: true } },
        childResponses: { include: { user: true } },
      },
    });
  }

  async update(id: string, data: UpdateCoordinationDrawingResponseInput, userId: string) {
    const existing = await prisma.coordinationDrawingResponse.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      throw new Error("Response not found");
    }

    if (existing.userId !== userId) {
      throw new Error("You can only update your own responses");
    }

    const { drawingId: _ignoredDrawingId, parentResponseId: _ignoredParentId, ...updateData } = data as any;

    return prisma.coordinationDrawingResponse.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        drawing: { select: { id: true, title: true, projectId: true } },
        childResponses: { include: { user: true } },
      },
    });
  }

  async get(data: GetCoordinationDrawingResponseInput) {
    return prisma.coordinationDrawingResponse.findUnique({
      where: { id: data.id, isDeleted: false },
      include: {
        user: true,
        drawing: { select: { id: true, title: true, projectId: true } },
        parentResponse: { include: { user: true } },
        childResponses: { include: { user: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.coordinationDrawingResponse.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Response not found");
    }

    if (existing.userId !== userId) {
      throw new Error("You can only delete your own responses");
    }

    return prisma.coordinationDrawingResponse.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getByDrawingId(drawingId: string) {
    return prisma.coordinationDrawingResponse.findMany({
      where: { drawingId, isDeleted: false },
      include: {
        user: true,
        childResponses: { include: { user: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}
