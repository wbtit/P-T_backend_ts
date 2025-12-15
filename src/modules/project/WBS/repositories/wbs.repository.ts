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

async getProjectDashboardStats(
  projectId: string,
  stage: Stage
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      estimatedHours: true,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const agg = await prisma.projectWbs.aggregate({
    where: {
      projectId,
      stage,
    },
    _sum: {
      totalQtyNo: true,
      totalExecHr: true,
      totalCheckHr: true,
      totalExecHrWithRework: true,
      totalCheckHrWithRework: true,
    },
    _count: {
      id: true,
    },
  });

  const plannedMinutes = (project.estimatedHours || 0) * 60;

  const exec = agg._sum.totalExecHr || 0;
  const check = agg._sum.totalCheckHr || 0;
  const execRw = agg._sum.totalExecHrWithRework || 0;
  const checkRw = agg._sum.totalCheckHrWithRework || 0;

  const actualMinutes = exec + check;
  const actualWithRework = execRw + checkRw;

  const consumedPercent = plannedMinutes
    ? (actualMinutes / plannedMinutes) * 100
    : 0;

  const reworkPercent = plannedMinutes
    ? ((actualWithRework - actualMinutes) / plannedMinutes) * 100
    : 0;

  return {
    plannedMinutes,
    actualMinutes,
    actualWithRework,
    consumedPercent,
    reworkPercent,

    totalExecHr: exec,
    totalCheckHr: check,
    totalQtyNo: agg._sum.totalQtyNo || 0,

    wbsCount: agg._count.id,
  };
}

async getActivityDashboardStats(
  projectId: string,
  stage: Stage
) {
  const grouped = await prisma.projectWbs.groupBy({
    by: ["type"],
    where: {
      projectId,
      stage,
    },
    _sum: {
      totalQtyNo: true,
      totalExecHr: true,
      totalCheckHr: true,
      totalExecHrWithRework: true,
      totalCheckHrWithRework: true,
    },
    _count: {
      id: true,
    },
  });

  return grouped.map(g => ({
    activityType: g.type,
    totalExecHr: g._sum.totalExecHr || 0,
    totalCheckHr: g._sum.totalCheckHr || 0,
    totalQtyNo: g._sum.totalQtyNo || 0,
    totalExecHrWithRework: g._sum.totalExecHrWithRework || 0,
    totalCheckHrWithRework: g._sum.totalCheckHrWithRework || 0,
    wbsCount: g._count.id,
  }));
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