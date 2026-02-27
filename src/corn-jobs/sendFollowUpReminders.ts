import prisma from "../config/database/client";
import { sendEmail } from "../services/mailServices/mailconfig";
import { followUpReminderTemplate } from "../services/mailServices/mailtemplates/followUpMailTemplate";
import { notifyByRoles } from "../utils/notifyByRole";

export function startOfToday(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0
  );
}

export function endOfToday(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999
  );
}
export function startOfTomorrow(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 0
  );
}

export function endOfTomorrow(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    23, 59, 59, 999
  );
}




export async function sendFollowUpReminders() {
  const tomorrowStart = startOfTomorrow();
  const tomorrowEnd = endOfTomorrow();

  const items = await prisma.clientCommunication.findMany({
    where: {
      isCompleted: false,
      reminderSent: false,
      followUpDate: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
    include: {
      createdBy: true,
      project: true,
    },
  });

  for (const item of items) {
    await sendEmail({
      to: item.createdBy.email||"",
      subject: `Follow-up reminder: ${item.project.name}`,
      html: followUpReminderTemplate(item.project.name,item.clientName,item.followUpDate.toString(),item.notes,item.createdBy.username),
    });

    await prisma.clientCommunication.update({
      where: { id: item.id },
      data: { reminderSent: true },
    });
    await notifyByRoles(["DEPUTY_MANAGER", "OPERATION_EXECUTIVE"], {
      type: "CLIENT_FOLLOWUP_APPROACHING",
      title: "Follow-Up Date Approaching",
      message: `Follow-up is due soon for project '${item.project.name}'.`,
      communicationId: item.id,
      followUpDate: item.followUpDate,
      timestamp: new Date(),
    });
  }

  const overdueItems = await prisma.clientCommunication.findMany({
    where: {
      isCompleted: false,
      followUpDate: { lt: startOfToday() },
    },
    include: { project: true },
  });
  for (const item of overdueItems) {
    await notifyByRoles(["DEPUTY_MANAGER", "OPERATION_EXECUTIVE"], {
      type: "CLIENT_FOLLOWUP_OVERDUE",
      title: "Follow-Up Overdue",
      message: `Follow-up is overdue for project '${item.project.name}'.`,
      communicationId: item.id,
      followUpDate: item.followUpDate,
      timestamp: new Date(),
    });
  }
}
