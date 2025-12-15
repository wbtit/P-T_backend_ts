import { Prisma, Stage } from "@prisma/client";


export async function createProjectWbsForStage(
  tx: Prisma.TransactionClient,
  projectId: string,
  stage: Stage
) {
  const selections = await tx.projectWbsSelection.findMany({
    where: { projectId, isActive: true },
    include: {
      wbsTemplate: { include: { lineItems: true } },
    },
  });

  for (const sel of selections) {
    const exists = await tx.projectWbs.findFirst({
      where: {
        projectId,
        stage,
        wbsTemplateId: sel.wbsTemplateId,
      },
    });

    if (exists) continue;

    const wbs = await tx.projectWbs.create({
      data: {
        projectId,
        stage,
        wbsTemplateId: sel.wbsTemplateId,
        templateVersion: sel.wbsTemplate.version,
        name: sel.wbsTemplate.name,
        type: sel.wbsTemplate.type,
      },
    });

    await tx.projectLineItem.createMany({
      data: sel.wbsTemplate.lineItems.map(li => ({
        projectWbsId: wbs.id,
        lineItemTemplateId: li.id,
        description: li.description,
        unitTime: li.unitTime,
        checkUnitTime: li.checkUnitTime,
      })),
    });
  }
}
