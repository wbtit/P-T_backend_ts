import prisma from "../../../config/database/client";
import { createSubDto, updateSubDto } from "../dtos";

export class SubmitalRepository {
  async create(data: createSubDto, userId: string, approval: boolean) {
    return await prisma.submittals.create({
      data: {
        description: data.description,
        subject: data.subject,
        fabricator_id: data.fabricator_id,
        files: data.files ?? [], // ✅ safer default
        project_id: data.project_id,
        recepient_id: data.recepient_id,
        sender_id: userId,
        isAproovedByAdmin: approval,
        status: true, // ✅ matches your model (boolean)
      },
      include: {
        recepients: true,
      },
    });
  }

  async findById(id: string) {
    return await prisma.submittals.findFirst({
      where: { id },
      include: {
        sender: {
          include: {
            managedFabricator: true, // ✅ assuming relation exists
          },
        },
        submittalsResponse: true,
      },
    });
  }

  async update(id: string, data: updateSubDto) {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Submittal not found");

    return await prisma.submittals.update({
      where: { id },
      data: {
        fabricator_id: data.fabricator_id ?? existing.fabricator_id,
        project_id: data.project_id ?? existing.project_id,
        recepient_id: data.recepient_id ?? existing.recepient_id,
        sender_id: data.sender_id ?? existing.sender_id,
        status:
          typeof data.status === "boolean" ? data.status : existing.status,
        stage: data.stage ?? existing.stage,
        subject: data.subject ?? existing.subject,
        description: data.description ?? existing.description,
        isAproovedByAdmin:
          typeof data.isAproovedByAdmin === "boolean"
            ? data.isAproovedByAdmin
            : existing.isAproovedByAdmin,
        files: data.files, // ✅ fallback to existing
      },
    });
  }

  async sentSubmittals(id: string) {
    return await prisma.submittals.findMany({
      where: { sender_id: id },
      include: {
        fabricator: true,
        project: true,
        recepients: true,
        sender: true,
        submittalsResponse: true,
      },
    });
  }

  async receivedSubmittals(id: string) {
    return await prisma.submittals.findMany({
      where: { recepient_id: id },
      include: {
        fabricator: true,
        project: true,
        recepients: true,
        sender: true,
        submittalsResponse: true,
      },
    });
  }
  

  async findByProject(id: string) {
    return await prisma.submittals.findMany({
      where: { project_id: id },
      include: {
        fabricator: true,
        project: true,
        recepients: true,
        sender: true,
        submittalsResponse: true,
      },
    });
  }
}
