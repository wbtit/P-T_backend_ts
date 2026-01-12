import { Stage, Activity, WbsDiscipline } from "@prisma/client";
import prisma from "../../../../config/database/client";

export class WbsRepository {
  /**
   * =========================================
   * PROJECT DASHBOARD — OVERALL
   * =========================================
   */
  async getProjectDashboardStats(
    projectId: string,
    stage: Stage
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { estimatedHours: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const agg = await prisma.projectWbs.aggregate({
      where: { projectId, stage },
      _sum: {
        totalQtyNo: true,
        totalExecHr: true,
        totalCheckHr: true,
        totalExecHrWithRework: true,
        totalCheckHrWithRework: true,
      },
      _count: { id: true },
    });

    const plannedMinutes = (project.estimatedHours || 0) * 60;

    const exec = agg._sum.totalExecHr || 0;
    const check = agg._sum.totalCheckHr || 0;
    const execRw = agg._sum.totalExecHrWithRework || 0;
    const checkRw = agg._sum.totalCheckHrWithRework || 0;

    const actualMinutes = exec + check;
    const actualWithRework = execRw + checkRw;

    return {
      plannedMinutes,
      actualMinutes,
      actualWithRework,
      consumedPercent: plannedMinutes
        ? (actualMinutes / plannedMinutes) * 100
        : 0,
      reworkPercent: plannedMinutes
        ? ((actualWithRework - actualMinutes) / plannedMinutes) * 100
        : 0,

      totalExecHr: exec,
      totalCheckHr: check,
      totalQtyNo: agg._sum.totalQtyNo || 0,
      wbsCount: agg._count.id,
    };
  }

  /**
   * =========================================
   * CATEGORY DASHBOARD (MODELING / DETAILING / ERECTION)
   * =========================================
   */
  async getCategoryDashboardStats(
    projectId: string,
    stage: Stage,
    category: Activity
  ) {
    const rows = await prisma.projectWbs.findMany({
      where: { projectId, stage },
      include: {
        projectBundle: {
          include: {
            bundle: true,
          },
        },
      },
    });

    const filtered = rows.filter(
      r => r.projectBundle.bundle.category === category
    );

    return this.aggregateRows(filtered);
  }

  /**
   * =========================================
   * DISCIPLINE DASHBOARD (EXECUTION / CHECKING)
   * =========================================
   */
  async getDisciplineDashboardStats(
    projectId: string,
    stage: Stage,
    discipline: WbsDiscipline
  ) {
    const rows = await prisma.projectWbs.findMany({
      where: {
        projectId,
        stage,
        discipline,
      },
    });

    return this.aggregateRows(rows);
  }

  /**
   * =========================================
   * BUNDLE-LEVEL BREAKDOWN
   * =========================================
   */
  async getBundleBreakdownStats(
  projectId: string,
  stage: Stage,
  bundleKey: string
) {
  return prisma.projectBundle.findUnique({
    where: {
      projectId_bundleKey_stage: {
        projectId,
        bundleKey,
        stage,
      },
    },
    select: {
      bundleKey: true,
      stage: true,
      totalQtyNo: true,
      totalExecHr: true,
      totalCheckHr: true,
      totalExecHrWithRework: true,
      totalCheckHrWithRework: true,
      bundle: {
        select: {
          name: true,
          category: true,
        },
      },
    },
  });
}


  /**
   * =========================================
   * INTERNAL AGGREGATOR (SHARED)
   * =========================================
   */
  private aggregateRows(rows: any[]) {
    const totals = {
      totalQtyNo: 0,
      totalExecHr: 0,
      totalCheckHr: 0,
      totalExecHrWithRework: 0,
      totalCheckHrWithRework: 0,
      wbsCount: rows.length,
    };

    for (const r of rows) {
      totals.totalQtyNo += r.totalQtyNo || 0;
      totals.totalExecHr += r.totalExecHr || 0;
      totals.totalCheckHr += r.totalCheckHr || 0;
      totals.totalExecHrWithRework += r.totalExecHrWithRework || 0;
      totals.totalCheckHrWithRework += r.totalCheckHrWithRework || 0;
    }

    return totals;
  }

  /**
   * =========================================
   * UPDATE PROJECT WBS AGGREGATES
   * =========================================
   */
  async updateProjectWbs(
    id: string,
    data: {
      totalQtyNo: number;
      totalExecHr: number;
      totalCheckHr: number;
      totalExecHrWithRework: number;
      totalCheckHrWithRework: number;
    }
  ) {
    return prisma.projectWbs.update({
      where: { id },
      data,
    });
  }
  async getProjectBundleBYProjectId(
    projectId: string
  ) {
    return prisma.projectBundle.findMany({
      where: { projectId },
      select: {
        bundleKey: true,
        stage: true,
        totalQtyNo: true,
        totalExecHr: true,
        totalCheckHr: true,
        totalExecHrWithRework: true,
        totalCheckHrWithRework: true,
        bundle: {
          select: {
            name: true,
            category: true,
          },
        },
        wbs:true
      },
    });
  }
}
