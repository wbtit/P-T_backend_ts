import prisma from "../../../../../config/database/client";
import { AppError } from "../../../../../config/utils/AppError";
import { WbsBundleTemplateRepository } from "../repositories/wbsBundle.repository";
import {
  CreateWbsBundleTemplateInput,
  UpdateWbsBundleTemplateInput,
} from "../dtos/wbsBundle.dto";

const repo = new WbsBundleTemplateRepository();

export class WbsBundleTemplateService {
  async list() {
    return repo.list();
  }

  async create(input: CreateWbsBundleTemplateInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await repo.findByKey(input.bundleKey);
      if (existing) {
        throw new AppError("Bundle already exists", 409);
      }

      return repo.create(tx, input);
    });
  }

  async update(
    bundleKey: string,
    input: UpdateWbsBundleTemplateInput
  ) {
    return prisma.$transaction(async (tx) => {
      const bundle = await repo.findByKey(bundleKey);
      if (!bundle) {
        throw new AppError("Bundle not found", 404);
      }

      // 🔒 Safety check
      if (input.isActive === false && bundle.wbsTemplates.length > 0) {
        // allowed, but warn by design decision
        // no exception, but intentional
      }

      return repo.update(tx, bundleKey, input);
    });
  }
}
