import { Prisma, Stage } from "@prisma/client";
import { createProjectWbsForStage } from "./createProjectWbsForStorage";

export async function handleStageChange(
  tx: Prisma.TransactionClient,
  projectId: string,
  oldStage: Stage,
  newStage: Stage
) {
  // close old stage
  await tx.projectStageHistory.updateMany({
    where: {
      projectID: projectId,
      endDate: null,
    },
    data: {
      endDate: new Date(),
    },
  });

  // open new stage
  await tx.projectStageHistory.create({
    data: {
      projectID: projectId,
      stage: newStage,
      startDate: new Date(),
    },
  });

  // snapshot WBS for new stage
  await createProjectWbsForStage(
    tx,
    projectId,
    newStage
  );
}
