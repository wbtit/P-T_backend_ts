import { Prisma } from "@prisma/client";

export async function recomputeProjectWbsTotals(
  tx: Prisma.TransactionClient,
  projectWbsId: string
) {
  const items = await tx.projectLineItem.findMany({
    where: { projectWbsId },
  });

  const totalQtyNo = items.reduce(
    (s, i) => s + (i.qtyNo || 0),
    0
  );
  const totalExecHr = items.reduce(
    (s, i) => s + (i.execHr || 0),
    0
  );
  const totalCheckHr = items.reduce(
    (s, i) => s + (i.checkHr || 0),
    0
  );
  const totalExecHrWithRework = items.reduce(
    (s, i) => s + (i.execHrWithRework || 0),
    0
  );
  const totalCheckHrWithRework = items.reduce(
    (s, i) => s + (i.checkHrWithRework || 0),
    0
  );

  await tx.projectWbs.update({
    where: { id: projectWbsId },
    data: {
      totalQtyNo,
      totalExecHr,
      totalCheckHr,
      totalExecHrWithRework,
      totalCheckHrWithRework,
    },
  });
}
