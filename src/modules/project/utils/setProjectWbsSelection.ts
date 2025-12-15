import { Prisma } from "@prisma/client";


export async function setProjectWbsSelection(
  tx: Prisma.TransactionClient,
  projectId: string,
  wbsTemplateIds: string[],
  userId?: string
) {
  if (!wbsTemplateIds.length) return;

  await tx.projectWbsSelection.updateMany({
    where: { projectId, isActive: true },
    data: { isActive: false },
  });

  await tx.projectWbsSelection.createMany({
    data: wbsTemplateIds.map(id => ({
      projectId,
      wbsTemplateId: id,
      selectedById: userId,
    })),
  });
}
