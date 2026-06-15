import prisma from "../../../../../config/database/client";
import { AppError } from "../../../../../config/utils/AppError";
import {
  CreateWbsLineItemTemplateInput,
  UpdateWbsLineItemTemplateInput    ,
} from "../dtos/wbsLineItemTemplates.dto";
import { WbsLineItemTemplateRepository } from "../repositories/wbsLineItemTemplate.repo";

const repo = new WbsLineItemTemplateRepository();

export class WbsLineItemTemplateService {
  /**
   * CREATE (safe)
   */
  async create(input: CreateWbsLineItemTemplateInput) {
    return prisma.$transaction(async (tx) => {
      const wbsTemplate = await tx.wbsTemplate.findUnique({
        where: { id: input.wbsTemplateId },
      });

      if (!wbsTemplate) {
        throw new AppError("Provided WBS template ID does not exist", 404);
      }

      if (!wbsTemplate.isActive) {
        throw new AppError("Cannot add line item to an inactive WBS template version", 400);
      }

      // If the template is already used in a project, modifying it directly
      // might affect existing projects unless we version bump it here too.
      // For now, we allow creation but guard against non-existent templates.
      return repo.create(tx, input);
    });
  }

  /**
   * UPDATE (version-safe)
   */
  async update(
    lineItemTemplateId: string,
    input: UpdateWbsLineItemTemplateInput
  ) {
    return prisma.$transaction(async (tx) => {
      const lineItem = await repo.findById(lineItemTemplateId);
      if (!lineItem) {
        throw new AppError("Line item template not found", 404);
      }

      const { wbsTemplate } = lineItem;

      // 1️⃣ Check if WBS template is already used
      const used = await tx.projectWbs.findFirst({
        where: {
          wbsTemplateKey: wbsTemplate.templateKey,
        },
      });

      // 2️⃣ If NOT used → safe to update in place
      if (!used) {
        return repo.update(tx, lineItemTemplateId, input);
      }

      // 3️⃣ If USED → clone WBS template (version bump)
      const newVersion = wbsTemplate.version + 1;

      const newWbsTemplate = await tx.wbsTemplate.create({
        data: {
          id: crypto.randomUUID(),
          name: wbsTemplate.name,
          templateKey: wbsTemplate.templateKey,
          bundleKey: wbsTemplate.bundleKey,
          discipline: wbsTemplate.discipline,
          version: newVersion,
        },
      });

      // 4️⃣ Clone all line items
      const existingLineItems =
        await repo.findByTemplate(wbsTemplate.id);

      for (const li of existingLineItems) {
        await tx.wbsLineItemTemplate.create({
          data: {
            wbsTemplateId: newWbsTemplate.id,
            description:
              li.id === lineItemTemplateId && input.description
                ? input.description
                : li.description,
            unitTime:
              li.id === lineItemTemplateId && input.unitTime !== undefined
                ? input.unitTime
                : li.unitTime,
            checkUnitTime:
              li.id === lineItemTemplateId &&
              input.checkUnitTime !== undefined
                ? input.checkUnitTime
                : li.checkUnitTime,
            templateKey: li.templateKey,
          },
        });
      }

      // 5️⃣ Deactivate old template
      await tx.wbsTemplate.update({
        where: { id: wbsTemplate.id },
        data: { isActive: false },
      });

      return newWbsTemplate;
    });
  }
}
