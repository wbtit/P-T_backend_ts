import { UserRole } from "@prisma/client";
import prisma from "../config/database/client";
import { sendNotification } from "./sendNotification";

export async function getActiveUserIdsByRoles(roles: UserRole[]): Promise<string[]> {
  if (!roles.length) return [];
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      isActive: true,
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function notifyUsers(userIds: string[], payload: any): Promise<void> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) return;

  await Promise.all(uniqueUserIds.map((userId) => sendNotification(userId, payload)));
}

export async function notifyByRoles(roles: UserRole[], payload: any): Promise<void> {
  const recipientIds = await getActiveUserIdsByRoles(roles);
  await notifyUsers(recipientIds, payload);
}
