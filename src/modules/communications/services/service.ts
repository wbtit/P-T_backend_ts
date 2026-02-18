import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { endOfToday, startOfToday } from "../utils/dayeRange";

export class ClientCommunicationService {
  private toDate(value: unknown, fieldName: string): Date {
    if (value === null || value === undefined || value === "") {
      throw new AppError(`${fieldName} is required`, 400);
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(`${fieldName} must be a valid date-time`, 400);
    }

    return parsed;
  }

  private toOptionalDate(value: unknown, fieldName: string): Date | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") {
      throw new AppError(`${fieldName} must be a valid date-time`, 400);
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(`${fieldName} must be a valid date-time`, 400);
    }

    return parsed;
  }

  async create(data: any, userId: string) {
    const { projectId, fabricatorId, communicationDate, followUpDate, ...rest } = data;

    if (!projectId) {
      throw new AppError("projectId is required", 400);
    }

    return prisma.clientCommunication.create({
      data: {
        ...rest,
        communicationDate: communicationDate
          ? this.toOptionalDate(communicationDate, "communicationDate")
          : undefined,
        followUpDate: this.toDate(followUpDate, "followUpDate"),
        project: { connect: { id: projectId } },
        createdBy: { connect: { id: userId } },
        ...(fabricatorId ? { fabricator: { connect: { id: fabricatorId } } } : {}),
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
    const {
      projectId,
      fabricatorId,
      communicationDate,
      followUpDate,
      ...rest
    } = data;

    return prisma.clientCommunication.update({
      where: { id },
      data: {
        ...rest,
        ...(projectId ? { project: { connect: { id: projectId } } } : {}),
        ...(fabricatorId === null
          ? { fabricator: { disconnect: true } }
          : fabricatorId
            ? { fabricator: { connect: { id: fabricatorId } } }
            : {}),
        ...(communicationDate !== undefined
          ? { communicationDate: this.toOptionalDate(communicationDate, "communicationDate") }
          : {}),
        ...(followUpDate !== undefined
          ? {
              followUpDate: this.toOptionalDate(followUpDate, "followUpDate"),
              reminderSent: false,
            }
          : {}),
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
