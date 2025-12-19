import { PLIRepository } from "../repositories";
import { AppError } from "../../../../config/utils/AppError";
import { PliInput,
    UpdatePliInput,
    GetPliByStageInput
 } from "../dtos";
import prisma from "../../../../config/database/client";
import { recomputeProjectWbsTotals } from "../utils/recomputeWbsTotal";

 const projectLineItemRepository = new PLIRepository();

 export class PLIService{
    async getByWbs(projectWbsId: string) {
  return projectLineItemRepository.findByWbs(projectWbsId);
}
async updateOne(
  id: string,
  data: {
    qtyNo?: number;
    execHr?: number;
    checkHr?: number;
    execHrWithRework?: number;
    checkHrWithRework?: number;
    checkUnitTime?: number;
    unitTime?: number;
  }
) {
  return prisma.$transaction(async tx => {
    const item = await projectLineItemRepository.findById(tx, id);
    if (!item) throw new AppError("Line item not found", 404);
    console.log("The data ",data)
    const updated = await projectLineItemRepository.update(
      tx,
      id,
      data
    );
console.log("The updated ",updated)

    // Important side-effect
    await recomputeProjectWbsTotals(
      tx,
      item.projectWbsId
    );

    return updated;
  });
}
async bulkUpdate(
  items: {
    id: string;
    qtyNo?: number;
    execHr?: number;
    checkHr?: number;
    checkUnitTime?: number;
    unitTime?: number;
  }[]
) {
  return prisma.$transaction(async tx => {
    const wbsIds = new Set<string>();

    for (const item of items) {
      const existing = await projectLineItemRepository.findById(
        tx,
        item.id
      );

      if (!existing) continue;

      wbsIds.add(existing.projectWbsId);

      await projectLineItemRepository.update(
        tx,
        item.id,
        item
      );
    }

    // Recompute affected WBS ONLY ONCE
    for (const wbsId of wbsIds) {
      await recomputeProjectWbsTotals(tx, wbsId);
    }
  });
}

}