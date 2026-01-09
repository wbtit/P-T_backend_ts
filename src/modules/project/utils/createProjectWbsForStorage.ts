import { Prisma, Stage } from "@prisma/client";


export async function createProjectWbsForStage(
  tx: Prisma.TransactionClient,
  projectId: string,
  stage: Stage
) {
  const selections = await tx.projectBundleSelection.findMany({
    where: { projectId },
    include: {
      bundle: {
        include: {
          wbsTemplates: {
            include: { lineItems: true }
          }
        }
      }
    },
  });

  for (const sel of selections) {
    // Create ProjectBundle if it doesn't exist for this stage
    const existingBundle = await tx.projectBundle.findFirst({
      where: {
        projectId,
        bundleKey: sel.bundleKey,
        stage,
      },
    });

    let projectBundleId: string;
    if (existingBundle) {
      projectBundleId = existingBundle.id;
    } else {
      const newBundle = await tx.projectBundle.create({
        data: {
          projectId,
          bundleKey: sel.bundleKey,
          stage,
        },
      });
      projectBundleId = newBundle.id;
    }

    for (const wbsTemplate of sel.bundle.wbsTemplates) {
      const exists = await tx.projectWbs.findFirst({
        where: {
          projectBundleId,
          wbsTemplateKey: wbsTemplate.templateKey,
        },
      });

      if (exists) continue;

      const wbs = await tx.projectWbs.create({
        data: {
          projectId,
          projectBundleId,
          wbsTemplateKey: wbsTemplate.templateKey,
          discipline: wbsTemplate.discipline,
          stage,
        },
      });

      await tx.projectLineItem.createMany({
        data: wbsTemplate.lineItems.map((li: any) => ({
          projectWbsId: wbs.id,
          lineItemTemplateId: li.id,
          description: li.description,
          unitTime: li.unitTime,
          checkUnitTime: li.checkUnitTime,
        })),
      });
    }
  }
}
