import prisma from "../../../../../config/database/client";
import { Prisma } from "@prisma/client";

export class WbsBundleTemplateRepository {
  findByKey(bundleKey: string) {
    return prisma.wbsBundleTemplate.findUnique({
      where: { bundleKey },
      include: {
        wbsTemplates: true,
      },
    });
  }

  list() {
    return prisma.wbsBundleTemplate.findMany({
      orderBy: { name: "asc" },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: {
      bundleKey: string;
      name: string;
      category: any;
      stage: any;
    }
  ) {
    return tx.wbsBundleTemplate.create({ data });
  }

  update(
    tx: Prisma.TransactionClient,
    bundleKey: string,
    data: Partial<{ name: string; isActive: boolean }>
  ) {
    return tx.wbsBundleTemplate.update({
      where: { bundleKey },
      data,
    });
  }
}
