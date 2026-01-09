import prisma from "../../../../config/database/client";
import { Prisma } from "@prisma/client";

export class PLIRepository {
  /**
   * ======================================
   * FIND LINE ITEMS BY PROJECT WBS
   * ======================================
   */
  async findByWbs(projectWbsId: string) {
    return prisma.projectLineItem.findMany({
      where: { projectWbsId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * ======================================
   * FIND LINE ITEM BY ID (TX-AWARE)
   * ======================================
   */
  async findById(
    tx: Prisma.TransactionClient,
    id: string
  ) {
    return tx.projectLineItem.findUnique({
      where: { id },
    });
  }

  /**
   * ======================================
   * UPDATE LINE ITEM (TX-AWARE)
   * ======================================
   */
  async update(
    tx: Prisma.TransactionClient,
    id: string,
    data: {
      qtyNo?: number;
      execHr?: number;
      checkHr?: number;
      execHrWithRework?: number;
      checkHrWithRework?: number;
      unitTime?: number;
      checkUnitTime?: number;
    }
  ) {
    return tx.projectLineItem.update({
      where: { id },
      data,
    });
  }
}
