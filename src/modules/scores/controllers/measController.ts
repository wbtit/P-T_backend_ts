import { Request, Response } from "express";
import { calculateManagerEstimationScore } from "../../../services/managerEstimationService";
import { runMonthlyMEAS } from "../../../corn-jobs/runMonthlyMEAS";
import { calculateManagerBias } from "../../../services/biasDetector";
import { getMEASTrendline } from "../../../services/measTrendService";
import { getManagerDashboardData } from "../../../services/managerDashboardService";
import { calculateEPSForEmployee } from "../../../services/employeePerformanceService";

export async function runMEASManually(req: Request, res: Response) {
  try {
    const { managerId, projectId } = req.body;

    if (!managerId || !projectId) {
      return res.status(400).json({
        success: false,
        message: "managerId and projectId are required",
      });
    }

    const result = await calculateManagerEstimationScore(
      managerId,
      projectId,
    );

    return res.status(200).json({
      success: true,
      message: "MEAS calculated successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("Error running MEAS manually:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

export async function runMEASMonthly(req: Request, res: Response){
    try {
        const result = await runMonthlyMEAS();
    return res.status(200).json({
        success:true,
        message:"Monthly MEAS calculation triggered."
    });
    } catch (error) {
        
    }
} 
export async function runBiasDetector(req: Request, res: Response) {
  try {
    const { managerId, projectId } = req.body;

    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: "managerId is required"
      });
    }

    const result = await calculateManagerBias(managerId, projectId);

    return res.json({
      success: true,
      data: result
    });
  } catch (err:any) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

export async function getMEASTrendlineHandler(req: Request, res: Response) {
  try {
    const { managerId, projectId } = req.query;

    if (!managerId || !projectId) {
      return res.status(400).json({
        success: false,
        message: "managerId and projectId are required"
      });
    }

    const trend = await getMEASTrendline(managerId as string, projectId as string);

    return res.json({
      success: true,
      data: trend
    });

  } catch (err: any) {
    console.error("Trendline error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }

  
}
export async function managerDashboardHandler(req: Request, res: Response) {
  try {
    const { managerId, projectId } = req.query;

    if (!managerId || !projectId) {
      return res.status(400).json({
        success: false,
        message: "managerId and projectId are required"
      });
    }

    const data = await getManagerDashboardData(managerId as string, projectId as string);

    return res.json({
      success: true,
      data
    });

  } catch (err:any) {
    console.error("Dashboard error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

export async function runEPSManually(req: Request, res: Response) {
  try {
    const { employeeId, year, month } = req.body;
    if (!employeeId || !year || !month) {
      return res.status(400).json({ success: false, message: "employeeId, year, month required" });
    }

    const result = await calculateEPSForEmployee(employeeId, Number(year), Number(month));
    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error("Error running EPS manually", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}