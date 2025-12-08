import { Request,Response } from "express";
import { WbsService } from "../services";
import { Stage,Activity } from "@prisma/client";

const wbsService = new WbsService();

export class WBSController{
    async create(req: Request, res: Response) {
        const data = req.body;
        const result = await wbsService.createWbs(data);
        return res.status(201).json(result);
    }

    async getAll(req: Request, res: Response) {
        const result = await wbsService.getAllWbs();
        return res.status(200).json(result);
    }
    async getById(req: Request, res: Response) {
        const { wbsId } = req.params;
        const result = await wbsService.getById(wbsId);
        return res.status(200).json(result);
    }

    async getWbsForProject(req: Request, res: Response) {
        const { projectId, stage, type } = req.params;
        const result = await wbsService.getWbsForProject(projectId, stage as Stage, type as Activity);
        return res.status(200).json(result);
    }

    async getTotalWbsHours(req: Request, res: Response) {
        const { projectId, stage } = req.params;
        const result = await wbsService.getTotalWbsHours(projectId, stage as Stage);
        return res.status(200).json(result);
    }

    async getWbsTotal(req: Request, res: Response) {
        const { projectId, stage, type } = req.params;
        const result = await wbsService.getWbsTotal(projectId, stage as Stage, type as Activity);
        return res.status(200).json(result);
    }

    async getWbsStats(req: Request, res: Response) {
        const { projectId, stage, type } = req.params;
        const result = await wbsService.getWbsStats(projectId, stage as Stage, type as Activity);
        return res.status(200).json(result);
    }
}