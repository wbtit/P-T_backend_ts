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

  public getMonthlyReport = async (req: AuthenticateRequest, res: Response) => {
    const { id, role, departmentId } = req.user!;
    const yearStr = req.query.year as string;
    const monthStr = req.query.month as string;

    if (!yearStr || !monthStr) {
      return res.status(400).json({ status: "error", message: "Year and month query parameters are required (e.g. ?year=2026&month=6)" });
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ status: "error", message: "Invalid year or month format" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    let whereClause: any = {
      requestedAt: {
        gte: startDate,
        lt: endDate
      }
    };

    if (role === "PROJECT_MANAGER") {
      whereClause.task = { project: { managerID: id } };
    } else if (role === "DEPT_MANAGER" || role === "DEPUTY_MANAGER") {
      whereClause.task = { departmentId: departmentId };
    }

    const requests = await prisma.trainingRequest.findMany({
      where: whereClause,
      include: {
        raisedBy: { select: { id: true, firstName: true, lastName: true } },
        linkedTrainingTask: { select: { id: true, status: true, name: true } },
        batch: { select: { id: true, status: true, topic: true } },
        task: { select: { id: true, name: true, serialNo: true } }
      },
      orderBy: { requestedAt: "desc" }
    });

    const reportData = requests.map(req => {
      let isTrainingDone = false;
      if (req.status === "APPROVED" && req.linkedTrainingTask?.status === "COMPLETED") {
        isTrainingDone = true;
      } else if (req.batch?.status === "TRAINING_DONE") {
        isTrainingDone = true;
      }

      return {
        requestId: req.id,
        user: `${req.raisedBy.firstName} ${req.raisedBy.lastName || ""}`.trim(),
        userId: req.raisedBy.id,
        topic: req.topic,
        reason: req.reason,
        requestedAt: req.requestedAt,
        status: req.status,
        rejectionReason: req.rejectionReason,
        isTrainingDone,
        isTaskAssigned: !!req.linkedTrainingTaskId,
        assignedTaskDetails: req.linkedTrainingTask ? {
          taskId: req.linkedTrainingTask.id,
          name: req.linkedTrainingTask.name,
          status: req.linkedTrainingTask.status
        } : null,
        batchDetails: req.batch ? {
          batchId: req.batch.id,
          topic: req.batch.topic,
          status: req.batch.status
        } : null,
        originalTaskName: req.task.name,
        originalTaskSerial: req.task.serialNo
      };
    });

    res.status(200).json({
      status: "success",
      metadata: { year, month, count: reportData.length },
      data: reportData
    });
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
