import { Prisma } from "@prisma/client";

/**
 * Recompute totals for a single ProjectBundle
 * Must be called INSIDE a transaction
 */
export async function recomputeProjectBundleTotals(
  tx: Prisma.TransactionClient,
  projectBundleId: string
) {
  // 1️⃣ Fetch all WBS under this bundle
  const wbsList = await tx.projectWbs.findMany({
    where: { projectBundleId },
    select: {
      discipline: true,
      totalQtyNo: true,
      totalExecHr: true,
      totalCheckHr: true,
      totalExecHrWithRework: true,
      totalCheckHrWithRework: true,
    },
  });

  if (wbsList.length === 0) {
    return;
  }

  // 2️⃣ Aggregate by discipline
  let totalQtyNo = 0;

  let execHr = 0;
  let checkHr = 0;

  let execHrRw = 0;
  let checkHrRw = 0;

  for (const wbs of wbsList) {
    totalQtyNo += wbs.totalQtyNo || 0;

    if (wbs.discipline === "EXECUTION") {
      execHr += wbs.totalExecHr || 0;
      execHrRw += wbs.totalExecHrWithRework || 0;
    }

    if (wbs.discipline === "CHECKING") {
      checkHr += wbs.totalCheckHr || 0;
      checkHrRw += wbs.totalCheckHrWithRework || 0;
    }
  }

  // 3️⃣ Update ProjectBundle
  await tx.projectBundle.update({
    where: { id: projectBundleId },
    data: {
      totalQtyNo,
      totalExecHr: execHr,
      totalCheckHr: checkHr,
      totalExecHrWithRework: execHrRw,
      totalCheckHrWithRework: checkHrRw,
    },
  });
}
