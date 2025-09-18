import { Request, Response } from "express";
import { EstimationTaskService } from "../services/estTask.service";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { AppError } from "../../../../config/utils/AppError";

const estimationTaskService = new EstimationTaskService();

export class EstimationTaskController {
    async handleCreateEstimationTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError("User not authenticated", 401);

        const assignedById = req.user.id;
        const task = await estimationTaskService.createTask(req.body, assignedById);

        res.status(201).json({
            status: "success",
            data: task,
        });
    }

    async handleReviewEstimationTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError("User not authenticated", 401);

        const { id } = req.params;
        const reviewerId = req.user.id;

        const reviewedTask = await estimationTaskService.reviewTask(id, req.body, reviewerId);

        res.status(200).json({
            status: "success",
            data: reviewedTask,
        });
    }

    async handleGetAllEstimationTasks(req: AuthenticateRequest, res: Response) {
        if (!req.user || req.user.role !== "ADMIN") {
            throw new AppError("Access denied", 403);
        }

        const tasks = await estimationTaskService.getAllTasks();

        res.status(200).json({
            status: "success",
            data: tasks,
        });
    }

    async handleGetEstimationTaskById(req: Request, res: Response) {
        const { id } = req.params;
        const task = await estimationTaskService.getTaskById(id);

        res.status(200).json({
            status: "success",
            data: task,
        });
    }

    async handleGetMyEstimationTasks(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError("User not authenticated", 401);

        const tasks = await estimationTaskService.getUserTasks(req.user.id);

        res.status(200).json({
            status: "success",
            data: tasks,
        });
    }

    async handleUpdateEstimationTask(req: Request, res: Response) {
        const { id } = req.params;
        const updated = await estimationTaskService.updateTask(id, req.body);

        res.status(200).json({
            status: "success",
            data: updated,
        });
    }

    async handleDeleteEstimationTask(req: Request, res: Response) {
        const { id } = req.params;
        const deleted = await estimationTaskService.deleteTask(id);

        res.status(200).json({
            status: "success",
            data: deleted,
        });
    }
}
