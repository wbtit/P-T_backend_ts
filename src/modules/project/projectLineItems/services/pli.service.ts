import { PLIRepository } from "../repositories";
import { AppError } from "../../../../config/utils/AppError";
import prisma from "../../../../config/database/client";
import { recomputeProjectWbsTotals } from "../utils/recomputeWbsTotal";
import { recomputeProjectBundleTotals } from "../../WBS/utils/recomputeBundleTotals";


const projectLineItemRepository = new PLIRepository();

export class PLIService {
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
    return prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch line item
      const item = await projectLineItemRepository.findById(tx, id);
      if (!item) throw new AppError("Line item not found", 404);

      // 2️⃣ Update line item
      const updated = await projectLineItemRepository.update(tx, id, data);

      // 3️⃣ Recompute WBS totals
      await recomputeProjectWbsTotals(tx, item.projectWbsId);

      // 4️⃣ Fetch ProjectWbs to get projectBundleId
      const wbs = await tx.projectWbs.findUnique({
        where: { id: item.projectWbsId },
        select: { projectBundleId: true },
      });

      if (wbs?.projectBundleId) {
        // 5️⃣ Recompute Bundle totals
        await recomputeProjectBundleTotals(tx, wbs.projectBundleId);
      }

      return updated;
    });
  }

  async bulkUpdate(
    items: {
      id: string;
      qtyNo?: number;
      execHr?: number;
      checkHr?: number;
      unitTime?: number;
      checkUnitTime?: number;
    }[]
  ) {
    return prisma.$transaction(async (tx) => {
      const affectedWbsIds = new Set<string>();
      const affectedBundleIds = new Set<string>();

      // 1️⃣ Update all line items
      for (const item of items) {
        const existing = await projectLineItemRepository.findById(tx, item.id);
        if (!existing) continue;

        affectedWbsIds.add(existing.projectWbsId);

        await projectLineItemRepository.update(tx, item.id, item);
      }

      // 2️⃣ Recompute all affected WBS
      for (const wbsId of affectedWbsIds) {
        await recomputeProjectWbsTotals(tx, wbsId);

        const wbs = await tx.projectWbs.findUnique({
          where: { id: wbsId },
          select: { projectBundleId: true },
        });

        if (wbs?.projectBundleId) {
          affectedBundleIds.add(wbs.projectBundleId);
        }
      }

      // 3️⃣ Recompute affected Bundles (ONLY ONCE EACH)
      for (const bundleId of affectedBundleIds) {
        await recomputeProjectBundleTotals(tx, bundleId);
      }
    });
  }

  async create(data: { projectWbsId: string; lineItemTemplateId: string }) {
    return prisma.$transaction(async (tx) => {
      // 1. Validate WBS exists
      const wbs = await tx.projectWbs.findUnique({
        where: { id: data.projectWbsId },
        select: { id: true, projectBundleId: true },
      });
      if (!wbs) throw new AppError("Project WBS not found", 404);

      // 2. Validate Template exists
      const template = await tx.wbsLineItemTemplate.findUnique({
        where: { id: data.lineItemTemplateId },
      });
      if (!template) throw new AppError("Line Item Template not found", 404);

      // 3. Check for duplicates
      const existing = await tx.projectLineItem.findUnique({
        where: {
          projectWbsId_lineItemTemplateId: {
            projectWbsId: data.projectWbsId,
            lineItemTemplateId: data.lineItemTemplateId,
          },
        },
      });
      if (existing) throw new AppError("Line item already exists in this WBS", 409);

      // 4. Create
      const newItem = await tx.projectLineItem.create({
        data: {
          projectWbsId: data.projectWbsId,
          lineItemTemplateId: data.lineItemTemplateId,
          description: template.description,
          unitTime: template.unitTime,
          checkUnitTime: template.checkUnitTime,
          qtyNo: 0,
          execHr: 0,
          checkHr: 0,
        },
      });

      return newItem;
    });
  }
}

