import { Request,Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFQService } from "../services/rfq.service";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { rfqhtmlContent } from "../../../services/mailServices/mailtemplates/rfqMailtemplate";
import { notifyRfqStakeholdersByRole } from "../../../utils/notifyRfqStakeholders";
import { UserRole } from "@prisma/client";
import prisma from "../../../config/database/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const rfqService = new RFQService();
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

type ThreadResponseNode = {
    createdAt: Date;
    user?: {
        connectionDesignerId: string | null;
    } | null;
    childResponses?: ThreadResponseNode[];
};

const flattenThreadResponses = (responses: ThreadResponseNode[]): ThreadResponseNode[] => {
    const flattened: ThreadResponseNode[] = [];

    responses.forEach((response) => {
        flattened.push(response);
        if (response.childResponses?.length) {
            flattened.push(...flattenThreadResponses(response.childResponses));
        }
    });

    return flattened;
};

const needsCompanyAttention = (
    responses: ThreadResponseNode[],
    connectionDesignerId: string
) => {
    const flattened = flattenThreadResponses(responses);
    if (flattened.length === 0) return true;

    const latestResponse = flattened.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];

    return latestResponse.user?.connectionDesignerId !== connectionDesignerId;
};

export class RFQController {
    async handleCreateRfq(req:AuthenticateRequest,res:Response){
    if (!req.user) {
    throw new AppError('User not found', 404);
    }
    const { id } = req.user;

    if(!id) throw new AppError('User not found', 404);
    const uploadedFileMap = (req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined) ?? {};
    const uploadedFiles = mapUploadedFiles(uploadedFileMap.files || [], "rfq");
    const uploadedCDAttachments = mapUploadedFiles(
      uploadedFileMap.CDAttachments || [],
      "rfqCDAttachments"
    );
        const result = await rfqService.createRfq({
          ...req.body,
          files: uploadedFiles,
          CDAttachments: uploadedCDAttachments,
        }, id);
        const newrfq = result.newRfq as any;
        // gather all recipient emails
        const emails = [
            ...(newrfq.multipleRecipients?.map((r: any) => r.email).filter(Boolean) || []),
            newrfq.recipient?.email
        ].filter(Boolean) as string[];

        const uniqueEmails = Array.from(new Set(emails));

        if (uniqueEmails.length === 0) {
          throw new AppError("No recipient email provided", 400);
        }
        const creatorId = id;
        // Background non-blocking tasks
        (async () => {
          try {
            const ccEmails = await getCCEmails();
            await sendEmail({
              html: rfqhtmlContent(newrfq),
              to: uniqueEmails.join(","),
              cc: ccEmails,
              subject: newrfq.subject,
              text: newrfq.description,
            });
            await notifyRfqStakeholdersByRole(newrfq.id, RFQ_NOTIFY_ROLES, (role) =>
              buildRoleScopedNotification(role, {
                type: "RFQ_CREATED",
                basePayload: { rfqId: newrfq.id, timestamp: new Date() },
                templates: {
                  creator: { title: "", message: "" },
                  external: { title: "RFQ Received", message: `RFQ '${newrfq.subject}' was received for your response.` },
                  oversight: { title: "RFQ Created / Sent", message: `RFQ '${newrfq.subject}' was created and sent for monitoring.` },
                  internal: { title: "New RFQ Created", message: `A new RFQ '${newrfq.subject}' was created.` },
                  default: { title: "RFQ Created / Sent", message: `RFQ '${newrfq.subject}' was created and sent.` },
                },
              }),
              { excludeUserIds: [creatorId] }
            );
          } catch (error) {
            console.error("Error in handleCreateRfq background tasks:", error);
          }
        })();

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

        const uploadedFileMap = (req.files as
          | { [fieldname: string]: Express.Multer.File[] }
          | undefined) ?? {};
        const uploadedFiles = mapUploadedFiles(uploadedFileMap.files || [], "rfq");
        const uploadedCDAttachments = mapUploadedFiles(
          uploadedFileMap.CDAttachments || [],
          "rfqCDAttachments"
        );
        const rfq = await rfqService.updateRfq(id, {
          ...req.body,
          files: uploadedFiles.length ? uploadedFiles : req.body.files,
          CDAttachments: uploadedCDAttachments.length
            ? uploadedCDAttachments
            : req.body.CDAttachments,
        });
        const updaterId = req.user.id;
        const bodyStatus = req.body?.status;

        // Background non-blocking tasks
        (async () => {
          try {
            await notifyRfqStakeholdersByRole(rfq.id, RFQ_NOTIFY_ROLES, (role) => {
              const currentStatus = (rfq as any).status ?? bodyStatus;
              if (currentStatus === "APPROVED" && ["CLIENT", "CLIENT_ADMIN", "CLIENT_PROJECT_COORDINATOR"].includes(role)) {
                return null;
              }
              return buildRoleScopedNotification(role, {
                type: "RFQ_UPDATED",
                basePayload: {
                  rfqId: rfq.id,
                  status: (rfq as any).status ?? bodyStatus ?? null,
                  timestamp: new Date(),
                },
                templates: {
                  creator: { title: "", message: "" },
                  external: { title: "RFQ Updated", message: `Updated RFQ '${rfq.subject}' was shared with you.` },
                  oversight: { title: "RFQ Updated", message: `RFQ '${rfq.subject}' was updated.` },
                  internal: { title: "RFQ Updated", message: `RFQ '${rfq.subject}' was updated.` },
                  default: { title: "RFQ Updated", message: `RFQ '${rfq.subject}' was updated.` },
                },
              });
            },
            { excludeUserIds: [updaterId] }
            );
          } catch (error) {
            console.error("Error in handleUpdateRfq background tasks:", error);
          }
        })();

        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async handleGetRfqById(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const {id}=req.params
        const rfq = await rfqService.getRfqById({id}, req.user);
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async handleClientSidePendingRFQs(req: AuthenticateRequest, res: Response) {
        if (req.user?.role !== "ADMIN" && req.user?.role !== "OPERATION_EXECUTIVE") {
            throw new AppError("Access denied", 403);
        }
        const pendingRFQs = await rfqService.getClientSidePendingRFQs();
        res.status(200).json({
            status: "success",
            data: pendingRFQs,
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

    async handlePendingForClient(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            throw new AppError('User not found', 404);
        }
        const { id } = req.user;
        const pendingRFQs = await rfqService.getPendingForClient(id);
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
        const { projectId } = req.params;
        const rfq = await rfqService.sents(id, projectId);
        
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
        const { projectId } = req.params;
        const rfq = await rfqService.received(id, projectId);
        res.status(200).json({
            status: 'success',
            data: rfq,
        });
    }
    async handleFindByProject(req: Request, res: Response) {
        const { projectId } = req.params;
        const rfqs = await rfqService.findByProject(projectId);

        res.status(200).json({
            status: 'success',
            data: rfqs,
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

    async handlePendingForDepartmentManager(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError('User not found', 404);
        const pendingRFQs = await rfqService.getPendingRFQsForDepartmentManager(req.user.id);
        res.status(200).json({
            status: 'success',
            data: pendingRFQs,
        });
    }

    async handlePendingForOperationExecutive(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError('User not found', 404);
        const pendingRFQs = await rfqService.getPendingRFQs();
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

    async handlePendingForCDAdmin(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError('User not found', 404);

        const connectionDesignerId = req.user.connectionDesignerId;
        if (!connectionDesignerId) {
            throw new AppError("Connection designer is not assigned for this user", 400);
        }

        const rfqs = await prisma.rFQ.findMany({
            where: {
                connectionDesignerRFQ: {
                    some: { id: connectionDesignerId },
                },
                isDeleted: false,
                status: {
                    notIn: ["AWARDED", "REJECTED"],
                },
            },
            include: {
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: {
                    where: { parentResponseId: null },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                middleName: true,
                                lastName: true,
                                email: true,
                                connectionDesignerId: true,
                            },
                        },
                        childResponses: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        middleName: true,
                                        lastName: true,
                                        email: true,
                                        connectionDesignerId: true,
                                    },
                                },
                            },
                        },
                    },
                },
                fabricator: true,
                project: { select: { name: true } },
                connectionEngineers: { select: { firstName: true, lastName: true, id: true } },
                connectionDesignerRFQ: {
                    include: {
                        CDEngineers: true,
                        CDQuotations: true,
                    },
                },
                CDQuotas: {
                    where: {
                        connectionDesignerId,
                        isDeleted: false,
                    },
                    include: {
                        connectionDesigner: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const pendingRFQs = rfqs.filter((rfq) => {
            if (rfq.responses.length === 0) {
                return rfq.CDQuotas.length === 0;
            }

            return needsCompanyAttention(
                rfq.responses as unknown as ThreadResponseNode[],
                connectionDesignerId
            );
        });

        res.status(200).json({
            status: 'success',
            data: pendingRFQs,
        });
    }
}
