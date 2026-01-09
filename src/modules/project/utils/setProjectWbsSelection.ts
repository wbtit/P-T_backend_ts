import { Prisma } from "@prisma/client";


export async function setProjectWbsSelection(
  tx: Prisma.TransactionClient,
  projectId: string,
  bundleKeys: string[],
  userId: string
) {
  if (!bundleKeys.length) return;

  // Delete existing selections for this project
  await tx.projectBundleSelection.deleteMany({
    where: { projectId },
  });

  // Create new selections
  await tx.projectBundleSelection.createMany({
    data: bundleKeys.map(bundleKey => ({
      projectId,
      bundleKey,
      selectedBy: userId,
    })),
  });
}
