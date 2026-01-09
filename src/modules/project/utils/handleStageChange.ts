import { Prisma, Stage } from "@prisma/client";
import { cloneBundlesForStage } from "./cloneBundlesForStage";

export async function handleStageChange(
  tx: Prisma.TransactionClient,
  projectId: string,
  oldStage: Stage,
  newStage: Stage
) {
  // 🛑 Safety: no-op guard
  if (oldStage === newStage) return;

  // 1️⃣ Close old stage
  await tx.projectStageHistory.updateMany({
    where: {
      projectID: projectId,
      endDate: null,
    },
    data: {
      endDate: new Date(),
    },
  });

  // 2️⃣ Open new stage
  await tx.projectStageHistory.create({
    data: {
      projectID: projectId,
      stage: newStage,
      startDate: new Date(),
    },
  });

  // 3️⃣ Clone bundles from old → new stage
  await cloneBundlesForStage(
    tx,
    projectId,
    oldStage,
    newStage
  );
}
