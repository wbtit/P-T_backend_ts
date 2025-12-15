import { Request,Response } from "express";
import { WbsService } from "../services";
import { Stage,Activity } from "@prisma/client";

const wbsService = new WbsService();

export class WBSController{

async getWbsTemplates(req: Request, res: Response) {
  const templates = await wbsService.list();
  res.json({ status: "success", data: templates });
}

async createWbsTemplate(req: Request, res: Response) {
  const template = await wbsService.create(req.body);
  res.status(201).json({ status: "success", data: template });
}

async getWbsStats(req: Request, res: Response) {
        const { projectId, stage, type } = req.params;
        const result = await wbsService.getWbsStats(projectId, stage as Stage, type as Activity);
        return res.status(200).json(result);
}

}