import { Request, Response } from "express";
import { calculateManagerEstimationScore } from "../../../services/managerEstimationService";
import { runMonthlyMEAS } from "../../../corn-jobs/runMonthlyMEAS";

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
