import { Activity, Stage } from "@prisma/client";
import prisma from "../../../../config/database/client";
import { WBSInput,UpdateWBSInput } from "../dtos";



export class WbsRepository{
    
    async getProjectWbs(
  projectId: string,
  stage: Stage,
  type: Activity
) {
  return prisma.projectWbs.findMany({
    where: {
      projectId,
      stage,
      type,
    },
    include: {
      lineItems: true,
    },
  });
}


async getTotalProjectWbsHours(
  projectId: string,
  stage: Stage
) {
  return prisma.projectWbs.aggregate({
    where: { projectId, stage },
    _sum: {
      totalExecHr: true,
      totalCheckHr: true,
      totalExecHrWithRework: true,
      totalCheckHrWithRework: true,
    },
  });
}


async getProjectWbsTotalByType(
  projectId: string,
  stage: Stage,
  type: Activity
) {
  return prisma.projectWbs.aggregate({
    where: { projectId, stage, type },
    _sum: {
      totalQtyNo: true,
      totalExecHr: true,
      totalCheckHr: true,
      totalExecHrWithRework: true,
      totalCheckHrWithRework: true,
    },
  });
}


async updateProjectWbs(
  id: string,
  data: UpdateWBSInput
) {
  return prisma.projectWbs.update({
    where: { id },
    data,
  });
}


}