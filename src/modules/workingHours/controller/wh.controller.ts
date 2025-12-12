import { es } from "zod/v4/locales/index.cjs";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { EstWHService } from "../services";
import { Request,Response } from "express";

const whService = new EstWHService();
export class EstWHController {

    // ------------------------
    // START TASK
    // ------------------------
    async handleStartTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) return res.status(404).json({ message: "User not found" });

        const userId = req.user.id;
        const estimationTaskId = req.params.id;

        if (!userId || !estimationTaskId)
            return res.status(404).json({ message: "User or task not found" });

        const findData = {
            user_id: userId,
            estimationTaskId
        };

        const wh = await whService.startTask(findData, estimationTaskId, userId);

        return res.status(201).json({
            status: "success",
            data: wh,
        });
    }

    // ------------------------
    // PAUSE TASK
    // ------------------------
    async handlePauseTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) return res.status(404).json({ message: "User not found" });

        const userId = req.user.id;
        const estimationTaskId = req.params.id;
        const { whId } = req.body;

        if (!userId || !estimationTaskId || !whId)
            return res.status(404).json({ message: "User, task, or WH session not found" });

        const findData = {
            user_id: userId,
            estimationTaskId
        };

        const updateData = {
            id: whId
        };

        const wh = await whService.pauseTask(findData, updateData);

        return res.status(200).json({
            status: "success",
            data: wh,
        });
    }

    // ------------------------
    // RESUME TASK
    // ------------------------
    async handleResumeTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) return res.status(404).json({ message: "User not found" });

        const userId = req.user.id;
        const estimationTaskId = req.params.id;

        if (!userId || !estimationTaskId)
            return res.status(404).json({ message: "User or task not found" });

        const findData = {
            user_id: userId,
            estimationTaskId
        };

        const wh = await whService.resumeTask(findData, estimationTaskId, userId);

        return res.status(200).json({
            status: "success",
            data: wh,
        });
    }

    // ------------------------
    // END TASK
    // ------------------------
    async handleEndTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) return res.status(404).json({ message: "User not found" });

        const userId = req.user.id;
        const estimationTaskId = req.params.id;
        const { whId } = req.body;

        if (!userId || !estimationTaskId || !whId)
            return res.status(404).json({ message: "User, task, or session not found" });

        const findData = {
            user_id: userId,
            estimationTaskId
        };

        const updateData = {
            id: whId,
        };

        const wh = await whService.endTask(findData, updateData);

        return res.status(200).json({
            status: "success",
            data: wh,
        });
    }

    // ------------------------
    // START REWORK
    // ------------------------
    async handleReworkStartTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) return res.status(404).json({ message: "User not found" });

        const userId = req.user.id;
        const estimationTaskId = req.params.id;

        if (!userId || !estimationTaskId)
            return res.status(404).json({ message: "User or task not found" });

        const findData = {
            user_id: userId,
            estimationTaskId
        };

        const wh = await whService.startRework(findData, estimationTaskId, userId);

        return res.status(201).json({
            status: "success",
            data: wh,
        });
    }

    // ------------------------
    // END REWORK
    // ------------------------
    async handleReworkEndTask(req: AuthenticateRequest, res: Response) {
        if (!req.user) return res.status(404).json({ message: "User not found" });

        const userId = req.user.id;
        const estimationTaskId = req.params.id;
        const { whId } = req.body;

        if (!userId || !estimationTaskId || !whId)
            return res.status(404).json({ message: "User, task, or WH session not found" });

        const findData = {
            user_id: userId,
            estimationTaskId
        };

        const updateData = { id: whId };

        const wh = await whService.endRework(findData, updateData);

        return res.status(200).json({
            status: "success",
            data: wh,
        });
    }

    // ------------------------
    // GET TASK SUMMARY
    // ------------------------
    async handleGetTaskSummary(req: AuthenticateRequest, res: Response) {
        if (!req.user) return res.status(404).json({ message: "User not found" });

        const userId = req.user.id;
        const estimationTaskId = req.params.id;

        if (!userId || !estimationTaskId)
            return res.status(404).json({ message: "User or task not found" });

        const findData = {
            user_id: userId,
            estimationTaskId
        };

        const summary = await whService.getTaskSummary(findData);

        return res.status(200).json({
            status: "success",
            data: summary,
        });
    }
}
