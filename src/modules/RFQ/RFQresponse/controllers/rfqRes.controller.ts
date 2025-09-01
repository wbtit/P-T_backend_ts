import { Request,Response } from "express";
import { RfqResponseService } from "../services/rfqRes.service";


const rfqResponseService = new RfqResponseService();
export class RfqResponseController {
    async handleCreate(req: Request, res: Response) {
        const result = await rfqResponseService.create(req.body);
        return res.status(201).json({
            success:true,
            data:result
        });
    }

    async handleGetById(req: Request, res: Response) {
        const result = await rfqResponseService.getById({ id: req.params.id });
        return res.status(200).json({
            success:true,
            data:result
        });
    }
}