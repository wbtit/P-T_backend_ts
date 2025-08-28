import { Request,Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFQService } from "../services/rfq.service";

const rfqService = new RFQService();

export class RFQController {
    async handleCreateRfq(req:AuthenticateRequest,res:Response){
    if (!req.user) {
    throw new AppError('User not found', 404);
    }
    const { id } = req.user;

    if(!id) throw new AppError('User not found', 404);
        const rfq = await rfqService.createRfq(req.body,id);
        res.status(201).json({
            status: 'success',
            data: rfq,
        });
    }
    async updateRfq(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const { id } = req.user;

        if(!id) throw new AppError('User not found', 404);
        const rfq = await rfqService.updateRfq(id, req.body);
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async getRfqById(req:Request,res:Response){
        const {id}=req.params
        const rfq = await rfqService.getRfqById({id});
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async sents(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const { id } = req.user;
        const rfq = await rfqService.sents(id);
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async received(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const { id } = req.user;
        const rfq = await rfqService.received(id);
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async closeRfq(req:AuthenticateRequest,res:Response){
        const {id}=req.params
        const rfq = await rfqService.closeRfq(id);
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
}