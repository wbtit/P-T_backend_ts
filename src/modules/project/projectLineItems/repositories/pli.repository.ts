import { ipv4 } from "zod";
import prisma from "../../../../config/database/client";
import { PliInput,
    UpdatePliInput,
    GetPliByStageInput
 } from "../dtos";
import { cleandata} from "../../../../config/utils/cleanDataObject";
import { Prisma, Stage } from "@prisma/client";

export class PLIRepository{
    async findByWbs(projectWbsId: string) {
  return prisma.projectLineItem.findMany({
    where: { projectWbsId },
    orderBy: { createdAt: "asc" },
  });
}
async findById(
  tx: Prisma.TransactionClient,
  id: string
) {
  return tx.projectLineItem.findUnique({
    where: { id },
  });
}
async update(
  tx: Prisma.TransactionClient,
  id: string,
  data: any
) {
  return tx.projectLineItem.update({
    where: { id },
    data,
  });
}

}