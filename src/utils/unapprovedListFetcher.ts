import prisma from "../config/database/client";

export async function getUnapprovedCounts(projectFilter: any, role: string) {
  const isPM = role === "PROJECT_MANAGER";

  const [unapprovedRFIsCount, unapprovedSubmittalsCount, unapprovedChangeOrdersCount] = await Promise.all([
    prisma.rFI.count({
      where: {
        project: projectFilter,
        isAproovedByAdmin: { not: true },
      },
    }),
    prisma.submittals.count({
      where: {
        project: projectFilter,
        isAproovedByAdmin: { not: true },
      },
    }),
    prisma.changeOrder.count({
      where: {
        Project: projectFilter,
        ...(isPM ? { isApprovedByManager: { not: true } } : { isAproovedByAdmin: { not: true } }),
      },
    }),
  ]);

  return {
    unapprovedRFIsCount,
    unapprovedSubmittalsCount,
    unapprovedChangeOrdersCount,
  };
}

export async function getUnapprovedLists(projectFilter: any, role: string) {
  const isPM = role === "PROJECT_MANAGER";

  const [unapprovedRFIsList, unapprovedSubmittalsList, unapprovedChangeOrdersList] = await Promise.all([
    prisma.rFI.findMany({
      where: {
        project: projectFilter,
        isAproovedByAdmin: { not: true },
      },
      include: {
        project: { select: { name: true, projectCode: true, projectNumber: true } },
        sender: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { date: "desc" }
    }),
    prisma.submittals.findMany({
      where: {
        project: projectFilter,
        isAproovedByAdmin: { not: true },
      },
      include: {
        project: { select: { name: true, projectCode: true, projectNumber: true } },
        sender: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { date: "desc" }
    }),
    prisma.changeOrder.findMany({
      where: {
        Project: projectFilter,
        ...(isPM ? { isApprovedByManager: { not: true } } : { isAproovedByAdmin: { not: true } }),
      },
      include: {
        Project: { select: { name: true, projectCode: true, projectNumber: true } },
        senders: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" }
    }),
  ]);

  return {
    unapprovedRFIsList,
    unapprovedSubmittalsList,
    unapprovedChangeOrdersList,
  };
}
