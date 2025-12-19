import prisma from "../config/database/client";
import { sendEmail } from "../services/mailServices/mailconfig";
import { followUpReminderTemplate } from "../services/mailServices/mailtemplates/followUpMailTemplate";

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
  }
}
