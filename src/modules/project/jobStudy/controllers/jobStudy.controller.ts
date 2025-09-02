import { Request,Response } from "express";
import { JobStudyService } from "../services";

const jobStudyService = new JobStudyService();

export class JobStudyController {
    async create(req: Request, res: Response) {
        const result = await jobStudyService.create(req.body);
        return res.json(result);
    }

    async update(req: Request, res: Response) {
        const result = await jobStudyService.update(req.params.id, req.body);
        return res.json(result);
    }

    async findByProjectId(req: Request, res: Response) {
        const result = await jobStudyService.findByProjectId({ id: req.params.id });
        return res.json(result);
    }
}