import { Prisma, Stage } from "@prisma/client";

export async function cloneBundlesForStage(
  tx: Prisma.TransactionClient,
  projectId: string,
  fromStage: Stage,
  toStage: Stage
) {
  // 1️⃣ Fetch bundles from previous stage
  const oldBundles = await tx.projectBundle.findMany({
    where: {
      projectId,
      stage: fromStage,
    },
    include: {
      wbs: {
        include: {
          lineItems: true,
        },
      },
    },
  });

  if (oldBundles.length === 0) {
    return;
  }

  // 2️⃣ Clone each bundle
  for (const oldBundle of oldBundles) {
    // Avoid duplicate cloning
    const exists = await tx.projectBundle.findUnique({
      where: {
        projectId_bundleKey_stage: {
          projectId,
          bundleKey: oldBundle.bundleKey,
          stage: toStage,
        },
      },
    });

    if (exists) continue;

    // 3️⃣ Create new ProjectBundle
    const newBundle = await tx.projectBundle.create({
      data: {
        projectId,
        bundleKey: oldBundle.bundleKey,
        stage: toStage,
      },
    });

    // 4️⃣ Clone WBS
    for (const oldWbs of oldBundle.wbs) {
      const newWbs = await tx.projectWbs.create({
        data: {
          projectId,
          projectBundleId: newBundle.id,
          wbsTemplateKey: oldWbs.wbsTemplateKey,
          discipline: oldWbs.discipline,
          stage: toStage,
        },
      });

      // 5️⃣ Clone Line Items (RESET values)
      await tx.projectLineItem.createMany({
        data: oldWbs.lineItems.map(li => ({
          projectWbsId: newWbs.id,
          lineItemTemplateId: li.lineItemTemplateId,
          description: li.description,
          unitTime: li.unitTime,
          checkUnitTime: li.checkUnitTime,

          // Reset progress
          qtyNo: 0,
          execHr: 0,
          checkHr: 0,
          execHrWithRework: 0,
          checkHrWithRework: 0,
        })),
      });
    }
  }
}
