import { Request,Response } from "express";
import { RfqResponseService } from "../services/rfqRes.service";
import { mapUploadedFiles } from "../../../uploads/fileUtil";
import { notifyRfqStakeholdersByRole } from "../../../../utils/notifyRfqStakeholders";
import { UserRole } from "@prisma/client";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { sendNotification } from "../../../../utils/sendNotification";
import { buildCreatorNotification, buildRoleScopedNotification } from "../../../../utils/stakeholderNotificationMessages";


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
    async handleCreate(req: AuthenticateRequest, res: Response) {
        const userId = req.user?.id;
        const uploadedFiles = mapUploadedFiles(
              (req.files as Express.Multer.File[]) || [],
              "rfqresponse"
            );
        const payload = {
      ...req.body,
      files: uploadedFiles,
    };
        const result = await rfqResponseService.create(payload);
        if (userId) {
            await sendNotification(userId, buildCreatorNotification("RFQ_RESPONSE_RECEIVED", {
                title: "RFQ Response Submitted",
                message: "You submitted an RFQ response.",
            }, {
                rfqId: result.rfqId,
                rfqResponseId: result.id,
                timestamp: new Date(),
            }));
        }
        await notifyRfqStakeholdersByRole(result.rfqId, RFQ_NOTIFY_ROLES, (role) =>
            buildRoleScopedNotification(role, {
                type: "RFQ_RESPONSE_RECEIVED",
                basePayload: { rfqId: result.rfqId, rfqResponseId: result.id, timestamp: new Date() },
                templates: {
                    creator: { title: "", message: "" },
                    external: { title: "RFQ Response Received", message: "A new RFQ response was received for your action." },
                    oversight: { title: "RFQ Response Received", message: "A new RFQ response was submitted and is available for review." },
                    internal: { title: "RFQ Response Received", message: "A new RFQ response was submitted." },
                    default: { title: "RFQ Response Received", message: "A new RFQ response has been submitted." },
                },
            }),
        {
            excludeUserIds: userId ? [userId] : [],
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
