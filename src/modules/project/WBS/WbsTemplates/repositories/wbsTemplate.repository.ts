import prisma from "../../../../../config/database/client";
import { Prisma, WbsDiscipline } from "@prisma/client";

export class WbsTemplateRepository {
  findById(id: string) {
    return prisma.wbsTemplate.findUnique({
      where: { id },
      include: { lineItems: true },
    });
  }

  findActiveByKey(templateKey: string) {
    return prisma.wbsTemplate.findFirst({
      where: {
        templateKey,
        isActive: true,
      },
      include: { lineItems: true },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: any
  ) {
    return tx.wbsTemplate.create({ data });
  }

  update(
    tx: Prisma.TransactionClient,
    id: string,
    data: Partial<{ name: string; discipline: any }>
  ) {
    return tx.wbsTemplate.update({
      where: { id },
      data,
    });
  }
}
