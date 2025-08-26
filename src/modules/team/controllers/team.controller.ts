import { Request,Response } from "express";
import { TeamService } from "../services";
import { AppError } from "../../../config/utils/AppError";

const teamService = new TeamService();

export class TeamController {
    async create(req: Request, res: Response) {
        const data=req.body
        const existing= await teamService.getByName(data.name);
        if(existing && existing.length>0){
            throw new AppError("Team already exists",409);
        }
        const result = await teamService.create(req.body);
        return res.status(201).json({
            message: "Team created successfully",
            data: result
        });
    }

    async getById(req: Request, res: Response) {
        const result = await teamService.getById({ id: req.params.id });
        return res.status(200).json({
            message: "Team retrieved successfully",
            data: result
        });
    }

    async getAll(req: Request, res: Response) {
        const result = await teamService.getAll();
        return res.status(200).json({
            message: "Teams retrieved successfully",
            data: result
        });
    }

    async update(req: Request, res: Response) {
        const result = await teamService.update({ id: req.params.id, ...req.body });
        return res.status(200).json({
            message: "Team updated successfully",
            data: result
        });
    }

    async delete(req: Request, res: Response) {
        const result = await teamService.delete({ id: req.params.id });
        return res.status(204).json({
            message: "Team deleted successfully",
            data: result
        });
    }
}