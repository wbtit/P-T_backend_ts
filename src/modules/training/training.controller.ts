import { Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { TrainingService } from "./training.service";
import prisma from "../../config/database/client";
import { AppError } from "../../config/utils/AppError";
import { parseHHMMToHours } from "../../utils/timeFormat";

export class TrainingController {
  private trainingService = new TrainingService();

  public raiseTrainingRequest = async (req: AuthenticateRequest, res: Response) => {
    const request = await this.trainingService.raiseTrainingRequest(req.user!.id, req.body);
    res.status(201).json({ status: "success", data: request });
  };

  public getPendingRequests = async (req: AuthenticateRequest, res: Response) => {
    const { id, role, departmentId } = req.user!;
    let whereClause: any = { status: { in: ["PENDING", "AWAITING_DECISION"] } };

    if (role === "PROJECT_MANAGER") {
      whereClause.task = { project: { managerID: id } };
    } else if (role === "DEPT_MANAGER" || role === "DEPUTY_MANAGER") {
      whereClause.task = { departmentId: departmentId };
    }

    const pendingRequests = await prisma.trainingRequest.findMany({
      where: whereClause,
      include: {
        task: true,
        raisedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    res.status(200).json({ status: "success", data: pendingRequests });
  };

  public getAllRequests = async (req: AuthenticateRequest, res: Response) => {
    const { id, role, departmentId } = req.user!;
    const statusQuery = req.query.status as string;
    
    let whereClause: any = {};
    if (statusQuery) {
      whereClause.status = { in: statusQuery.split(",") };
    }

    if (role === "PROJECT_MANAGER") {
      whereClause.task = { project: { managerID: id } };
    } else if (role === "DEPT_MANAGER" || role === "DEPUTY_MANAGER") {
      whereClause.task = { departmentId: departmentId };
    }

    const requests = await prisma.trainingRequest.findMany({
      where: whereClause,
      include: {
        task: true,
        raisedBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { requestedAt: "desc" }
    });
    res.status(200).json({ status: "success", data: requests });
  };

  public approveTrainingRequest = async (req: AuthenticateRequest, res: Response) => {
    const result = await this.trainingService.approveTrainingRequest(req.user!, req.params.requestId, req.body);
    res.status(200).json({ status: "success", data: result });
  };

  public rejectTrainingRequest = async (req: AuthenticateRequest, res: Response) => {
    const request = await this.trainingService.rejectTrainingRequest(req.user!, req.params.requestId, req.body);
    res.status(200).json({ status: "success", data: request });
  };

  public getVariance = async (req: AuthenticateRequest, res: Response) => {
    const { taskId } = req.params;

    const task = await prisma.task.findFirst({
      where: { id: taskId, taskType: "TRAINING" },
      include: { allocationLog: true, workingHourTask: true }
    });

    if (!task) throw new AppError("Training task not found", 404);

    const estimatedHours = parseHHMMToHours(task.allocationLog?.allocatedHours || "00:00");
    
    const totalSeconds = task.workingHourTask.reduce((sum, wh) => sum + (wh.duration_seconds || 0), 0);
    const actualHours = totalSeconds / 3600;

    const varianceHours = actualHours - estimatedHours;
    const variancePercent = estimatedHours > 0 ? (varianceHours / estimatedHours) * 100 : 0;

    res.status(200).json({
      status: "success",
      data: {
        estimatedHours,
        actualHours,
        varianceHours,
        variancePercent
      }
    });
  };

  public suggestBatchableRequests = async (req: AuthenticateRequest, res: Response) => {
    const { departmentId } = req.query;
    if (!departmentId || typeof departmentId !== "string") {
      throw new AppError("departmentId query parameter is required", 400);
    }
    const result = await this.trainingService.suggestBatchableRequests(req.user!.id, departmentId);
    res.status(200).json({ status: "success", data: result });
  };

  public createTrainingBatch = async (req: AuthenticateRequest, res: Response) => {
    const result = await this.trainingService.createTrainingBatch(req.user!, req.body);
    res.status(201).json({ status: "success", data: result });
  };

  public completeTrainerSession = async (req: AuthenticateRequest, res: Response) => {
    const result = await this.trainingService.completeTrainerSession(req.user!.id, req.params.batchId);
    res.status(200).json(result);
  };

  public getMyTrainerBatches = async (req: AuthenticateRequest, res: Response) => {
    const result = await this.trainingService.getMyTrainerBatches(req.user!.id);
    res.status(200).json({ status: "success", data: result });
  };

  public getAllBatches = async (req: AuthenticateRequest, res: Response) => {
    const result = await this.trainingService.getAllBatches(req.user!);
    res.status(200).json({ status: "success", data: result });
  };
}
