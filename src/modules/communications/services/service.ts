import prisma from "../../../config/database/client";
import { endOfToday, startOfToday } from "../utils/dayeRange";

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

  async   getMyFollowUps(userId: string) {
  const now = new Date();

  return {
    overdue: await prisma.clientCommunication.findMany({
      where: {
        createdById: userId,
        isCompleted: false,
        followUpDate: { lt: now },
      },
    }),
    today: await prisma.clientCommunication.findMany({
      where: {
        createdById: userId,
        isCompleted: false,
        followUpDate: {
          gte: startOfToday(),
          lte: endOfToday(),
        },
      },
    }),
    upcoming: await prisma.clientCommunication.findMany({
      where: {
        createdById: userId,
        isCompleted: false,
        followUpDate: { gt: endOfToday() },
      },
    }),
  };


}
}
