import { Request, Response } from "express";
import { WbsService } from "../services";
import { Activity, Stage, WbsDiscipline } from "@prisma/client";

const wbsService = new WbsService();

export class WbsController {
  /**
   * ======================================
   * TEMPLATE / LIBRARY (READ ONLY)
   * ======================================
   */

  // GET all bundle templates with WBS + line items
  async getBundleTemplates(req: Request, res: Response) {
    const templates = await wbsService.listBundleTemplates();
    res.status(200).json({
      status: "success",
      data: templates,
    });
  }

  /**
   * ======================================
   * PROJECT DASHBOARDS
   * ======================================
   */

  // Overall project dashboard (all bundles)
  async getProjectDashboardStats(req: Request, res: Response) {
    const { projectId, stage } = req.params;

    const result = await wbsService.getProjectDashboardStats(
      projectId,
      stage as Stage
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  }

  // Category dashboard (MODELING / DETAILING / ERECTION)
  async getCategoryDashboardStats(req: Request, res: Response) {
    const { projectId, stage, category } = req.params;

    const result = await wbsService.getCategoryDashboardStats(
      projectId,
      stage as Stage,
      category as Activity
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  }

  // Discipline dashboard (EXECUTION / CHECKING)
  async getDisciplineDashboardStats(req: Request, res: Response) {
    const { projectId, stage, discipline } = req.params;

    const result = await wbsService.getDisciplineDashboardStats(
      projectId,
      stage as Stage,
      discipline as WbsDiscipline
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
//get bundle level breakdown
  async getBundleBreakdownStats(req: Request, res: Response) {
    const { projectId, stage, bundleKey } = req.params;

    const result = await wbsService.getBundleBreakdownStats(
      projectId,
      stage as Stage,
      bundleKey
    );

    return res.status(200).json({
      status: "success",
      data: result,
    });
  }


  //getProjectBundleBYProjectId
  async getProjectBundleBYProjectId(req: Request, res: Response) {
    const { projectId } = req.params;

    const result = await wbsService.getProjectBundleBYProjectId(
      projectId
    );

    return res.status(200).json({
      status: "success",
      data: result,
    });
  }
}


