import { Request,Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFQService } from "../services/rfq.service";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { rfqhtmlContent } from "../../../services/mailServices/mailtemplates/rfqMailtemplate";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

const rfqService = new RFQService();
const RFQ_NOTIFY_ROLES: UserRole[] = ["ADMIN", "SALES_MANAGER", "SALES_PERSON"];

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
        const result = await rfqService.createRfq({
          ...req.body,
          files: uploadedFiles,
        }, id);
        console.log("rfq created: ", result);
        const newrfq = result.newRfq;
        const email = newrfq.recipient.email; // This might be null
        if (!email) {
          throw new Error("No recipient email provided");
        }
        const ccEmails = await getCCEmails();
                await sendEmail({
              html: rfqhtmlContent(newrfq),
              to: email,
              cc: ccEmails,
              subject: newrfq.subject,
              text: newrfq.description,
            });
                await notifyByRoles(RFQ_NOTIFY_ROLES, {
                  type: "RFQ_CREATED",
                  title: "RFQ Created / Sent",
                  message: `RFQ '${newrfq.subject}' was created and sent.`,
                  rfqId: newrfq.id,
                  timestamp: new Date(),
                });
                res.status(201).json({
                    status: 'success',
                    data: result,
                });
    }
    async handleUpdateRfq(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const {id}=req.params;
        
        const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfq"
    );
        const rfq = await rfqService.updateRfq(id, {
          ...req.body,
          files: uploadedFiles
        });
        await notifyByRoles(RFQ_NOTIFY_ROLES, {
          type: "RFQ_UPDATED",
          title: "RFQ Updated",
          message: `RFQ '${rfq.subject}' was updated.`,
          rfqId: rfq.id,
          status: (rfq as any).status ?? req.body?.status ?? null,
          timestamp: new Date(),
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
    async handlePendingForClientAdmin(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const { id } = req.user;
        const pendingRFQs = await rfqService.getPendingForClientAdmin(id);
        res.status(200).json({
            status: 'success',
            data: pendingRFQs,
        });
    }
    async getRFQOfConnectionEngineer(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const { id } = req.user;

        const rfqs = await rfqService.getRFQOfConnectionEngineer(id);
        res.status(200).json({
            status: 'success',
            data: rfqs,
        });
    }

    async handleGetAllRFQ(req:Request,res:Response){
        const rfq = await rfqService.getAllRFQ();
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
    async handleDeleteRFQ(req:AuthenticateRequest,res:Response){
        const {id}=req.params
        const rfq = await rfqService.deleteRFQ(id);
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

    async handlePendingRFQs(req:AuthenticateRequest,res:Response){
        
        const pendingRFQs = await rfqService.getPendingRFQs();
        res.status(200).json({
            status: 'success',
            data: pendingRFQs,
        });
    }

    async handlePendingForProjectManager(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError('User not found', 404);
        const pendingRFQs = await rfqService.getPendingRFQsForProjectManager(req.user.id);
        res.status(200).json({
            status: 'success',
            data: pendingRFQs,
        });
    }

    async handleNewForProjectManager(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError('User not found', 404);
        const newRFQs = await rfqService.getNewRFQsForProjectManager(req.user.id);
        res.status(200).json({
            status: 'success',
            data: newRFQs,
        });
    }
}
