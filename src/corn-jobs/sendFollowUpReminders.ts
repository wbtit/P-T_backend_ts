import prisma from "../config/database/client";

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
    await mailService.send({
      to: item.createdBy.email,
      subject: `Follow-up reminder: ${item.project.name}`,
      body: `
        Project: ${item.project.name}
        Client: ${item.clientName}
        Follow-up Date: ${item.followUpDate}

        Notes:
        ${item.notes}
      `,
    });

    await prisma.clientCommunication.update({
      where: { id: item.id },
      data: { reminderSent: true },
    });
  }
}
