import { Request,Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFQService } from "../services/rfq.service";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail } from "../../../services/mailServices/mailconfig";
import { rfqhtmlContent } from "../../../services/mailServices/mailtemplates/rfqMailtemplate";

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
    );  console.log("req.body of rfq: ", req.body);
        const newrfq = await rfqService.createRfq({
          ...req.body,
          files: uploadedFiles
        }, id);
        const email = newrfq.recipient.email; // This might be null
        if (!email) {
          throw new Error("No recipient email provided");
        }
                await sendEmail({
              html: rfqhtmlContent(newrfq),
              to: email,
              subject: newrfq.subject,
              text: newrfq.description,
            });
                res.status(201).json({
                    status: 'success',
                    data: newrfq,
                });
    }
    async handleUpdateRfq(req:AuthenticateRequest,res:Response){
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
        const file = await rfqService.getFile(rfqId, fileId);
        res.status(200).json({
            status: 'success',
            data: file,
        });
    }
    async handleViewFile(req:Request,res:Response){
        const { rfqId, fileId } = req.params;
        await rfqService.viewFile(rfqId, fileId, res);
    }
}