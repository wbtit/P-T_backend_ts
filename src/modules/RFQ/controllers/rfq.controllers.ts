import { Request,Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFQService } from "../services/rfq.service";
import { mapUploadedFiles } from "../../uploads/fileUtil";

const rfqService = new RFQService();

export class RFQController {
    async handleCreateRfq(req:AuthenticateRequest,res:Response){
    if (!req.user) {
    throw new AppError('User not found', 404);
    }
    const { id } = req.user;

    if(!id) throw new AppError('User not found', 404);
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfq"
    );
        const rfq = await rfqService.createRfq({
          ...req.body,
          files: uploadedFiles
        }, id);
        res.status(201).json({
            status: 'success',
            data: rfq,
        });
    }
    async hanleUpdateRfq(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const { id } = req.user;
        if(!id) throw new AppError('User not found', 404);
        const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfq"
    );
        const rfq = await rfqService.updateRfq(id, {
          ...req.body,
          files: uploadedFiles
        });
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async handleGetRfqById(req:Request,res:Response){
        const {id}=req.params
        const rfq = await rfqService.getRfqById({id});
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async handleSents(req:AuthenticateRequest,res:Response){
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
    async handleReceived(req:AuthenticateRequest,res:Response){
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
    async handleCloseRfq(req:AuthenticateRequest,res:Response){
        const {id}=req.params
        const rfq = await rfqService.closeRfq(id);
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async handleGetFile(req:Request,res:Response){
        const { rfqId, fileId } = req.params;
        const file = await rfqService.getFile(rfqId, fileId, req);
        res.status(200).json({
            status: 'success',
            data: file,
        });
    }
}