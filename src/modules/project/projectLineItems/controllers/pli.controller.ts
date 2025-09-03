import { Request,Response } from "express";
import { PLIService } from "../services";
import { Stage } from "@prisma/client";
const pliService = new PLIService();
export class PLIController{
    async createPli(req:Request,res:Response){
        const {projectID,workBreakDownID} = req.params;
        const data = req.body;
        const result = await pliService.createPli(data, projectID, workBreakDownID);
        return res.status(201).json(result);
    }
    async updatePli(req:Request,res:Response){
        const {id} = req.params;
        const data = req.body;
        const result = await pliService.updatePli(id, data);
        return res.status(200).json(result);
    }
    async getPliByStage(req:Request,res:Response){
        const {projectID,workBreakDownID,stage} = req.params;
        const result = await pliService.getPliByStage({projectID,workBreakDownID,stage: stage as Stage});
        return res.status(200).json(result);
    }
}