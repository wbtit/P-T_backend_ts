import { Stage, Activity, WbsDiscipline } from "@prisma/client";
import prisma from "../../../../config/database/client";
import { AppError } from "../../../../config/utils/AppError";
import { ProjectRepository } from "../../repositories";
import { WbsRepository } from "../repositories";

const projectRepository = new ProjectRepository();
const wbsRepository = new WbsRepository();

export class WbsService {
  /**
   * =========================================
   * TEMPLATE / LIBRARY (READ ONLY)
   * =========================================
   */

  async listBundleTemplates() {
    return prisma.wbsBundleTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        wbsTemplates: {
          where: { isActive: true, isDeleted: false },
          orderBy: { name: "asc" },
          include: {
            lineItems: {
              where: { isActive: true, isDeleted: false },
              orderBy: { description: "asc" },
            },
          },
        },
      },
    });
  }

  /**
   * =========================================
   * PROJECT DASHBOARD — OVERALL
   * =========================================
   */

  async getProjectDashboardStats(
    projectId: string,
    stage: Stage
  ) {
    const project = await projectRepository.get({ id: projectId });
    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return wbsRepository.getProjectDashboardStats(
      projectId,
      stage
    );
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
    return wbsRepository.getCategoryDashboardStats(
      projectId,
      stage,
      category
    );
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
    return wbsRepository.getDisciplineDashboardStats(
      projectId,
      stage,
      discipline
    );
  }

  /**
   * =========================================
   * BUNDLE-LEVEL BREAKDOWN (OPTIONAL / ADVANCED)
   * =========================================
   */

  async getBundleBreakdownStats(
    projectId: string,
    stage: Stage,
    bundleKey: string
  ) {
    return wbsRepository.getBundleBreakdownStats(
      projectId,
      stage,
      bundleKey
    );
  }

  
}
