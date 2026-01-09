import { Prisma, Stage } from "@prisma/client";

export async function ensureCheckingWbsForBundle(
  tx: Prisma.TransactionClient,
  projectId: string,
  projectBundleId: string,
  stage: string
) {
  // 1️⃣ Fetch all EXECUTION WBS in this bundle
  const executionWbs = await tx.projectWbs.findMany({
    where: {
      projectBundleId,
      discipline: "EXECUTION",
      stage : stage as Stage,
    },
    include: {
      wbsTemplate: {
        include: {
          lineItems: true,
        },
      },
    },
  });

  if (executionWbs.length === 0) return;

  // 2️⃣ Fetch existing CHECKING WBS
  const existingChecking = await tx.projectWbs.findMany({
    where: {
      projectBundleId,
      discipline: "CHECKING",
      stage: stage as Stage,
    },
  });

  const existingCheckKeys = new Set(
    existingChecking.map(w => w.wbsTemplateKey)
  );

  // 3️⃣ Generate missing CHECKING WBS
  for (const execWbs of executionWbs) {
    if (existingCheckKeys.has(execWbs.wbsTemplateKey)) continue;

    // Create CHECKING ProjectWbs
    const checkingWbs = await tx.projectWbs.create({
      data: {
        projectId,
        projectBundleId,
        wbsTemplateKey: execWbs.wbsTemplateKey,
        discipline: "CHECKING",
        stage: stage as Stage,
      },
    });

    // Create CHECKING line items
    await tx.projectLineItem.createMany({
      data: execWbs.wbsTemplate.lineItems.map(li => ({
        projectWbsId: checkingWbs.id,
        lineItemTemplateId: li.id,
        description: `${li.description} (Checking)`,
        unitTime: li.checkUnitTime,
        checkUnitTime: 0,
      })),
    });
  }
}
