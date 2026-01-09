import prisma from "../../../../../config/database/client";
import { AppError } from "../../../../../config/utils/AppError";
import { WbsTemplateRepository } from "../repositories/wbsTemplate.repository";
import {
  CreateWbsTemplateInput,
  UpdateWbsTemplateInput,
} from "../dtos/wbsTemplate.dto";

const repo = new WbsTemplateRepository();

export class WbsTemplateService {
  /**
   * CREATE (simple, version = 1)
   */
  async create(input: CreateWbsTemplateInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await repo.findActiveByKey(input.templateKey);
      if (existing) {
        throw new AppError("WBS template already exists", 409);
      }

      return repo.create(tx, {
        ...input,
        version: 1,
      });
    });
  }

  /**
   * UPDATE (version-safe)
   */
  async update(
    wbsTemplateId: string,
    input: UpdateWbsTemplateInput
  ) {
    return prisma.$transaction(async (tx) => {
      const template = await repo.findById(wbsTemplateId);
      if (!template) {
        throw new AppError("WBS template not found", 404);
      }

      // 1️⃣ Check usage
      const used = await tx.projectWbs.findFirst({
        where: {
          wbsTemplateKey: template.templateKey,
        },
      });

      // 2️⃣ Not used → update in place
      if (!used) {
        return repo.update(tx, wbsTemplateId, input);
      }

      // 3️⃣ Used → version bump
      const newVersion = template.version + 1;

      const newTemplate = await repo.create(tx, {
        name: input.name ?? template.name,
        templateKey: template.templateKey,
        bundleKey: template.bundleKey,
        discipline: input.discipline ?? template.discipline,
        version: newVersion,
      });

      // 4️⃣ Clone line items
      for (const li of template.lineItems) {
        await tx.wbsLineItemTemplate.create({
          data: {
            wbsTemplateId: newTemplate.id,
            description: li.description,
            unitTime: li.unitTime,
            checkUnitTime: li.checkUnitTime,
            templateKey: li.templateKey,
          },
        });
      }

      // 5️⃣ Deactivate old template
      await tx.wbsTemplate.update({
        where: { id: template.id },
        data: { isActive: false },
      });

      return newTemplate;
    });
  }
}
