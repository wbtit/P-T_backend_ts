import { Request, Response } from "express";
import { calculateManagerEstimationScore } from "../../../services/managerEstimationService";
import { runMonthlyMEAS } from "../../../corn-jobs/runMonthlyMEAS";
import { calculateManagerBias } from "../../../services/biasDetector";
import { getMEASTrendline } from "../../../services/measTrendService";
import { getManagerDashboardData } from "../../../services/managerDashboardService";
import { calculateEPSForEmployee } from "../../../services/employeePerformanceService";
import { runMonthlyEPS } from "../../../corn-jobs/runMonthlyEPS";
import { calculateTeamEfficiencyForTeam } from "../../../services/teamEfficiencyService";
import { runMonthlyTES } from "../../../corn-jobs/runMonthlyTES";

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
    console.log("MEAS calculation result:", result);
    return res.status(200).json({
      success: true,
      message: "MEAS calculated successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("Error running MEAS manually:", err);
    return res.status(err?.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
}

export async function runMEASMonthly(req: Request, res: Response){
    try {
        const summary = await runMonthlyMEAS();
    return res.status(200).json({
        success:true,
        message:"Monthly MEAS calculation completed.",
        data: summary,
    });
    } catch (error: any) {
      console.error("Error running monthly MEAS:", error);
      return res.status(error?.statusCode || 500).json({
        success: false,
        message: error?.message ?? "Failed to run monthly MEAS",
      });
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

export async function runEPSForAllManually(req: Request, res: Response) {
  try {
    const { year, month } = req.body ?? {};

    if ((year && !month) || (!year && month)) {
      return res.status(400).json({
        success: false,
        message: "Provide both year and month, or neither.",
      });
    }

    const now = new Date();
    const parsedYear =
      year !== undefined ? Number(year) : now.getFullYear();
    const parsedMonth =
      month !== undefined ? Number(month) : now.getMonth() + 1;

    if (
      (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100)
    ) {
      return res.status(400).json({
        success: false,
        message: "year must be an integer between 2000 and 2100",
      });
    }

    if (
      (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)
    ) {
      return res.status(400).json({
        success: false,
        message: "month must be an integer between 1 and 12",
      });
    }

    const summary = await runMonthlyEPS(parsedYear, parsedMonth);
    return res.status(200).json({
      success: true,
      message: "EPS calculation for all eligible employees completed.",
      data: summary,
    });
  } catch (err: any) {
    console.error("Error running EPS for all employees:", err);
    return res.status(err?.statusCode || 500).json({
      success: false,
      message: err?.message ?? "Failed to run EPS for all employees",
    });
  }
}

export async function runTESForTeamManually(req: Request, res: Response) {
  try {
    const { teamId, year, month } = req.body ?? {};

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "teamId is required",
      });
    }

    if ((year && !month) || (!year && month)) {
      return res.status(400).json({
        success: false,
        message: "Provide both year and month, or neither.",
      });
    }

    const now = new Date();
    const parsedYear =
      year !== undefined ? Number(year) : now.getFullYear();
    const parsedMonth =
      month !== undefined ? Number(month) : now.getMonth() + 1;

    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({
        success: false,
        message: "year must be an integer between 2000 and 2100",
      });
    }

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        success: false,
        message: "month must be an integer between 1 and 12",
      });
    }

    const result = await calculateTeamEfficiencyForTeam(
      teamId as string,
      parsedYear,
      parsedMonth
    );

    return res.status(200).json({
      success: true,
      message: "TES calculated for team successfully.",
      data: result,
    });
  } catch (err: any) {
    console.error("Error running TES for team:", err);
    return res.status(err?.statusCode || 500).json({
      success: false,
      message: err?.message ?? "Failed to run TES for team",
    });
  }
}

export async function runTESForAllManually(req: Request, res: Response) {
  try {
    const { year, month } = req.body ?? {};

    if ((year && !month) || (!year && month)) {
      return res.status(400).json({
        success: false,
        message: "Provide both year and month, or neither.",
      });
    }

    const now = new Date();
    const parsedYear =
      year !== undefined ? Number(year) : now.getFullYear();
    const parsedMonth =
      month !== undefined ? Number(month) : now.getMonth() + 1;

    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({
        success: false,
        message: "year must be an integer between 2000 and 2100",
      });
    }

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        success: false,
        message: "month must be an integer between 1 and 12",
      });
    }

    const summary = await runMonthlyTES(parsedYear, parsedMonth);
    return res.status(200).json({
      success: true,
      message: "TES calculation for all teams completed.",
      data: summary,
    });
  } catch (err: any) {
    console.error("Error running TES for all teams:", err);
    return res.status(err?.statusCode || 500).json({
      success: false,
      message: err?.message ?? "Failed to run TES for all teams",
    });
  }
}
