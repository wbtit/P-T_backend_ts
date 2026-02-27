import { Request,Response } from "express";
import { RfqResponseService } from "../services/rfqRes.service";
import { mapUploadedFiles } from "../../../uploads/fileUtil";
import { notifyByRoles } from "../../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";


const rfqResponseService = new RfqResponseService();
const RFQ_NOTIFY_ROLES: UserRole[] = [
    "ADMIN",
    "SALES_MANAGER",
    "SALES_PERSON",
    "CLIENT",
    "CLIENT_ADMIN",
    "CLIENT_PROJECT_COORDINATOR",
    "VENDOR",
    "VENDOR_ADMIN",
];
export class RfqResponseController {
    async handleCreate(req: Request, res: Response) {
        const uploadedFiles = mapUploadedFiles(
              (req.files as Express.Multer.File[]) || [],
              "rfqresponse"
            );
        const payload = {
      ...req.body,
      files: uploadedFiles,
    };
        const result = await rfqResponseService.create(payload);
        await notifyByRoles(RFQ_NOTIFY_ROLES, {
            type: "RFQ_RESPONSE_RECEIVED",
            title: "RFQ Response Received",
            message: "A new RFQ response has been submitted.",
            rfqId: result.rfqId,
            rfqResponseId: result.id,
            timestamp: new Date(),
        });
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

    async handleGetFile(req: Request, res: Response) {
        const { rfqResId, fileId } = req.params;
        const file = await rfqResponseService.getFile(rfqResId, fileId);
        return res.status(200).json({
            success: true,
            data: file
        });
    }
    async handleViewFile(req: Request, res: Response) {
        const { rfqResId, fileId } = req.params;
        await rfqResponseService.viewFile(rfqResId, fileId, res);
    }
}
