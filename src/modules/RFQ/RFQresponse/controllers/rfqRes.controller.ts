import { Request,Response } from "express";
import { RfqResponseService } from "../services/rfqRes.service";
import { mapUploadedFiles } from "../../../uploads/fileUtil";
import { notifyRfqStakeholdersByRole } from "../../../../utils/notifyRfqStakeholders";
import { UserRole } from "@prisma/client";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { buildRoleScopedNotification } from "../../../../utils/stakeholderNotificationMessages";
import prisma from "../../../../config/database/client";
import { responseMailTemplate } from "../../../../services/mailServices/mailtemplates/responseMailTemplate";
import {
    formatParticipantName,
    sendResponseParticipantMail,
} from "../../../../services/mailServices/responseMailUtils";


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
        const [rfqMailContext, responder] = await Promise.all([
            prisma.rFQ.findUnique({
                where: { id: result.rfqId },
                include: {
                    project: { select: { name: true } },
                    recipient: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            middleName: true,
                            lastName: true,
                            username: true,
                            designation: true,
                        }
                    },
                    multipleRecipients: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            middleName: true,
                            lastName: true,
                            username: true,
                            designation: true,
                        }
                    },
                    sender: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            middleName: true,
                            lastName: true,
                            username: true,
                            designation: true,
                        }
                    },
                }
            }),
            userId
                ? prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        middleName: true,
                        lastName: true,
                        username: true,
                        designation: true,
                    }
                })
                : Promise.resolve(null),
        ]);

        if (rfqMailContext && responder) {
            const responseLabel = req.body?.parentResponseId ? "RFQ Reply" : "RFQ Response";
            const responderName = formatParticipantName(responder);

            // Background non-blocking tasks
            (async () => {
                try {
                    await sendResponseParticipantMail({
                        sender: rfqMailContext.sender,
                        primaryRecipient: rfqMailContext.recipient,
                        multipleRecipients: rfqMailContext.multipleRecipients,
                        responder,
                        subject: `${responseLabel}: ${rfqMailContext.subject}`,
                        text: result.description || `${responseLabel} received for ${rfqMailContext.subject}`,
                        buildHtml: ({ greeting, involvedNames }) =>
                            responseMailTemplate({
                                title: "Project Station - RFQ Response",
                                projectName: rfqMailContext.project?.name || rfqMailContext.projectName,
                                subjectLine: `${responseLabel} - ${rfqMailContext.subject}`,
                                greeting,
                                intro: `A new ${req.body?.parentResponseId ? "reply" : "response"} has been added to the RFQ thread in Project Station. Please review the latest update below:`,
                                details: [
                                    { label: "Reference", value: rfqMailContext.serialNo || "N/A" },
                                    { label: "Project", value: rfqMailContext.project?.name || rfqMailContext.projectName || "N/A" },
                                    { label: "Subject", value: rfqMailContext.subject || "N/A" },
                                    { label: "Response By", value: responderName },
                                    { label: "Response Status", value: result.status },
                                    { label: "WBT Status", value: result.wbtStatus },
                                    { label: "Description", value: result.description || "N/A" },
                                    { label: "Response Date", value: new Date(result.createdAt).toDateString() },
                                ],
                                involvedRecipients: involvedNames,
                                responderName,
                                responderDesignation: responder.designation,
                                ctaLabel: "Login to View RFQ",
                            }),
                    });

                    await notifyRfqStakeholdersByRole(result.rfqId, RFQ_NOTIFY_ROLES, (role) => {
                        if (result.status === "APPROVED" && ["CLIENT", "CLIENT_ADMIN", "CLIENT_PROJECT_COORDINATOR"].includes(role)) {
                            return null;
                        }
                        return buildRoleScopedNotification(role, {
                            type: "RFQ_RESPONSE_RECEIVED",
                            basePayload: { rfqId: result.rfqId, rfqResponseId: result.id, timestamp: new Date() },
                            templates: {
                                creator: { title: "", message: "" },
                                external: { title: "RFQ Response Received", message: "A new RFQ response was received for your action." },
                                oversight: { title: "RFQ Response Received", message: "A new RFQ response was submitted and is available for review." },
                                internal: { title: "RFQ Response Received", message: "A new RFQ response was submitted." },
                                default: { title: "RFQ Response Received", message: "A new RFQ response has been submitted." },
                            },
                        });
                    },
                    {
                        excludeUserIds: userId ? [userId] : [],
                    });
                } catch (error) {
                    console.error("Error in rfqResponse background tasks:", error);
                }
            })();
        }
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
