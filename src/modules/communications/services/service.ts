import prisma from "../../../config/database/client";

export class ClientCommunicationService {
  async create(data: any, userId: string) {
    return prisma.clientCommunication.create({
      data: {
        ...data,
        createdById: userId,
      },
    });
  }

  async list(filters: any) {
    return prisma.clientCommunication.findMany({
      where: {
        isCompleted: filters.isCompleted ?? undefined,
        projectId: filters.projectId ?? undefined,
      },
      orderBy: { followUpDate: "asc" },
    });
  }

  async update(id: string, data: any) {
    return prisma.clientCommunication.update({
      where: { id },
      data: {
        ...data,
        reminderSent: false, // reset if follow-up date changes
      },
    });
  }

  async complete(id: string) {
    return prisma.clientCommunication.update({
      where: { id },
      data: { isCompleted: true },
    });
  }
}
