import { PLIRepository } from "../repositories";
import { AppError } from "../../../../config/utils/AppError";
import prisma from "../../../../config/database/client";
import { recomputeProjectWbsTotals } from "../utils/recomputeWbsTotal";

const projectLineItemRepository = new PLIRepository();

export class PLIService {
  /**
   * ======================================
   * GET LINE ITEMS BY PROJECT WBS
   * ======================================
   */
  async getByWbs(projectId: string, projectWbsId: string) {
    const wbs = await prisma.projectWbs.findFirst({
      where: {
        id: projectWbsId,
        projectId,
      },
      select: { id: true },
    });

    if (!wbs) {
      throw new AppError("WBS not found for this project", 404);
    }

    return projectLineItemRepository.findByWbs(projectWbsId);
  }

  /**
   * ======================================
   * UPDATE SINGLE LINE ITEM
   * ======================================
   */
  async updateOne(
    projectId: string,
    lineItemId: string,
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
    return prisma.$transaction(async tx => {
      const item = await projectLineItemRepository.findById(tx, lineItemId);
      if (!item) {
        throw new AppError("Line item not found", 404);
      }

      // 🔒 Project ownership validation
      const wbs = await tx.projectWbs.findFirst({
        where: {
          id: item.projectWbsId,
          projectId,
        },
        select: { id: true },
      });

      if (!wbs) {
        throw new AppError("Unauthorized line item access", 403);
      }

      const updated = await projectLineItemRepository.update(
        tx,
        lineItemId,
        data
      );

      // 🔁 Recompute WBS aggregates
      await recomputeProjectWbsTotals(tx, item.projectWbsId);

      return updated;
    });
  }

  /**
   * ======================================
   * BULK UPDATE LINE ITEMS
   * ======================================
   */
  async bulkUpdate(
    projectId: string,
    items: {
      id: string;
      qtyNo?: number;
      execHr?: number;
      checkHr?: number;
      unitTime?: number;
      checkUnitTime?: number;
    }[]
  ) {
    return prisma.$transaction(async tx => {
      const affectedWbsIds = new Set<string>();

      for (const item of items) {
        const existing = await projectLineItemRepository.findById(
          tx,
          item.id
        );
        if (!existing) continue;

        // 🔒 Project ownership validation
        const wbs = await tx.projectWbs.findFirst({
          where: {
            id: existing.projectWbsId,
            projectId,
          },
          select: { id: true },
        });

        if (!wbs) continue;

        affectedWbsIds.add(existing.projectWbsId);

        await projectLineItemRepository.update(
          tx,
          item.id,
          item
        );
      }

      // 🔁 Recompute affected WBS totals
      for (const wbsId of affectedWbsIds) {
        await recomputeProjectWbsTotals(tx, wbsId);
      }
    });
  }
}
