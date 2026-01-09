import prisma from "../../../../../config/database/client";
import { Prisma } from "@prisma/client";

export class WbsLineItemTemplateRepository {
  create(
    tx: Prisma.TransactionClient,
    data: {
      wbsTemplateId: string;
      description: string;
      unitTime: number;
      checkUnitTime: number;
      templateKey: string;
    }
  ) {
    return tx.wbsLineItemTemplate.create({ data });
  }

  update(
    tx: Prisma.TransactionClient,
    id: string,
    data: Partial<{
      description: string;
      unitTime: number;
      checkUnitTime: number;
    }>
  ) {
    return tx.wbsLineItemTemplate.update({
      where: { id },
      data,
    });
  }

  findById(id: string) {
    return prisma.wbsLineItemTemplate.findUnique({
      where: { id },
      include: { wbsTemplate: true },
    });
  }

  findByTemplate(wbsTemplateId: string) {
    return prisma.wbsLineItemTemplate.findMany({
      where: { wbsTemplateId, isActive: true },
    });
  }
}
