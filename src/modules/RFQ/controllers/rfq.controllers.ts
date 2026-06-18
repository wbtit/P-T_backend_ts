import { Request,Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFQService } from "../services/rfq.service";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails, getEmailsByRoles } from "../../../services/mailServices/mailconfig";
import { rfqhtmlContent } from "../../../services/mailServices/mailtemplates/rfqMailtemplate";
import { cdRfqHtmlContent } from "../../../services/mailServices/mailtemplates/cdRfqMailTemplate";
import { notifyRfqStakeholdersByRole } from "../../../utils/notifyRfqStakeholders";
import { UserRole } from "@prisma/client";
import prisma from "../../../config/database/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";
import { sendNotification } from "../../../utils/sendNotification";
import {
  notifyMtoClientEstimatorsForRfq,
  notifyMtoClientEstimatorsForRfqStatus,
} from "../../../utils/notifyMtoClientEstimators";
import {
  internalRfqRaisedHtmlContent,
  internalRfqRaisedTextContent,
} from "../../../services/mailServices/mailtemplates/internalRfqRaisedMailtemplate";

const rfqService = new RFQService();
const RFQ_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_PERSON",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_ACCOUNTANT",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

const INTERNAL_GROUP_ROLES: UserRole[] = [
  "ADMIN",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "ESTIMATION_HEAD",
];

const ESTIMATION_HEAD_ONLY_ROLES: UserRole[] = [
  "ESTIMATION_HEAD",
];

const INTERNAL_RFQ_CREATOR_ROLES = new Set<UserRole>([
  "ADMIN",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "ESTIMATION_HEAD",
]);

const buildUserDisplayName = (user: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) =>
  [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ") ||
  user.username ||
  "Unknown User";

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
    const { id, role } = req.user;

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
            const [internalGroupEmails, estimationHeadEmails, rfqSender, senderFabricator] = await Promise.all([
              getEmailsByRoles(INTERNAL_GROUP_ROLES),
              getEmailsByRoles(ESTIMATION_HEAD_ONLY_ROLES),
              newrfq.senderId
                ? prisma.user.findUnique({
                    where: { id: newrfq.senderId },
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                      username: true,
                    },
                  })
                : Promise.resolve(null),
              newrfq.senderId
                ? prisma.fabricator.findFirst({
                    where: {
                      OR: [
                        { pointOfContact: { some: { id: newrfq.senderId } } },
                        { wbtFabricatorPointOfContact: { some: { id: newrfq.senderId } } },
                        { createdById: newrfq.senderId },
                      ],
                    },
                    select: {
                      fabName: true,
                    },
                  })
                : Promise.resolve(null),
            ]);
            const isInternalCreator = INTERNAL_RFQ_CREATOR_ROLES.has(role as UserRole);
            const fabricatorName = !isInternalCreator ? (senderFabricator?.fabName || undefined) : undefined;

            if (req.body.ConnectionDesignerIds && req.body.ConnectionDesignerIds.length > 0) {
              const cdEngineers = await prisma.user.findMany({
                where: {
                  connectionDesignerId: { in: req.body.ConnectionDesignerIds },
                  role: "CONNECTION_DESIGNER_ENGINEER"
                },
                select: { id: true, email: true }
              });
              const cdEmails = cdEngineers.map(e => e.email).filter(Boolean) as string[];
              if (cdEmails.length > 0) {
                const uniqueCdEmails = Array.from(new Set(cdEmails));
                await sendEmail({
                  html: cdRfqHtmlContent(newrfq, fabricatorName),
                  to: uniqueCdEmails.join(","),
                  subject: `RFQ Connection Design Assignment: ${newrfq.project?.name || newrfq.projectName || "N/A"} - ${newrfq.subject}`,
                  text: `You have been assigned as a Connection Designer for RFQ: ${newrfq.subject}`
                });
              }

              for (const cd of cdEngineers) {
                await sendNotification(cd.id, {
                  type: "rfq",
                  title: "RFQ Assigned",
                  message: `You have been assigned as a Connection Designer for RFQ: ${newrfq.subject}`,
                  rfqId: newrfq.id,
                  projectId: (newrfq as any).projectId || (newrfq as any).project_id || undefined,
                  projectName: newrfq.project?.name || newrfq.projectName || "N/A"
                });
              }
            }

            // 1. STANDARD RFQ MAIL (Old Template)
            // For internal creators, send standard mail to Client only.
            // For external creators (Client, etc.), send to Client + Internal Group (Admin, OE, Deputy, Estimators).
            const standardMailTo = isInternalCreator 
              ? uniqueEmails 
              : Array.from(new Set([...uniqueEmails, ...internalGroupEmails]));

            await sendEmail({
              html: rfqhtmlContent(newrfq, fabricatorName),
              to: standardMailTo.join(","),
              subject: newrfq.subject,
              text: newrfq.description,
            });

            // 2. INTERNAL RFQ-RAISED MAIL (New Template)
            const raisedAt = newrfq.createdAt ? new Date(newrfq.createdAt) : new Date();
            const creatorName =
              senderFabricator?.fabName ||
              buildUserDisplayName(rfqSender || newrfq.sender || req.user);
            const internalMailSubject = `RFQ Raised: ${newrfq.project?.name || newrfq.projectName || "N/A"} - ${newrfq.subject}`;
            let internalRecipients: string[] = [];

            if (isInternalCreator) {
              // Internal creators trigger internal group notification via internal template
              internalRecipients = internalGroupEmails;
            } else {
              // External creators trigger only Estimation Head notification via internal template
              internalRecipients = estimationHeadEmails;
            }

            const uniqueInternalRecipients = Array.from(new Set(internalRecipients.filter(Boolean)));

            if (uniqueInternalRecipients.length > 0) {
              await sendEmail({
                to: uniqueInternalRecipients.join(","),
                subject: internalMailSubject,
                text: internalRfqRaisedTextContent({
                  creatorName,
                  projectName: newrfq.project?.name || newrfq.projectName || "N/A",
                  raisedAt,
                }),
                html: internalRfqRaisedHtmlContent({
                  creatorName,
                  projectName: newrfq.project?.name || newrfq.projectName || "N/A",
                  raisedAt,
                }),
              });
            }

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

            await notifyMtoClientEstimatorsForRfq(
              newrfq.id,
              {
                type: "RFQ_CREATED",
                title: "MTO RFQ Received",
                message: `MTO RFQ '${newrfq.subject}' was shared with your team.`,
                rfqId: newrfq.id,
                timestamp: new Date(),
              },
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
            if (req.body.ConnectionDesignerIds && req.body.ConnectionDesignerIds.length > 0) {
              const cdEngineers = await prisma.user.findMany({
                where: {
                  connectionDesignerId: { in: req.body.ConnectionDesignerIds },
                  role: "CONNECTION_DESIGNER_ENGINEER"
                },
                select: { id: true, email: true }
              });
              const cdEmails = cdEngineers.map(e => e.email).filter(Boolean) as string[];
              if (cdEmails.length > 0) {
                const uniqueCdEmails = Array.from(new Set(cdEmails));
                await sendEmail({
                  html: cdRfqHtmlContent(rfq),
                  to: uniqueCdEmails.join(","),
                  subject: `RFQ Connection Design Assignment: ${(rfq as any).project?.name || (rfq as any).projectName || "N/A"} - ${rfq.subject}`,
                  text: `You have been assigned as a Connection Designer for RFQ: ${rfq.subject}`
                });
              }

              for (const cd of cdEngineers) {
                await sendNotification(cd.id, {
                  type: "rfq",
                  title: "RFQ Assigned",
                  message: `You have been assigned as a Connection Designer for RFQ: ${rfq.subject}`,
                  rfqId: rfq.id,
                  projectId: (rfq as any).projectId || (rfq as any).project_id || undefined,
                  projectName: (rfq as any).project?.name || (rfq as any).projectName || "N/A"
                });
              }
            }

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

            await notifyMtoClientEstimatorsForRfq(
              rfq.id,
              {
                type: "RFQ_UPDATED",
                title: "MTO RFQ Updated",
                message: `MTO RFQ '${rfq.subject}' was updated.`,
                rfqId: rfq.id,
                status: (rfq as any).status ?? bodyStatus ?? null,
                timestamp: new Date(),
              },
              { excludeUserIds: [updaterId] }
            );

            await notifyMtoClientEstimatorsForRfqStatus(
              rfq.id,
              String((rfq as any).status ?? bodyStatus ?? ""),
              rfq.subject,
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
        if (
            req.user?.role !== "ADMIN" && 
            req.user?.role !== "OPERATION_EXECUTIVE" &&
            req.user?.role !== "DEPUTY_MANAGER" &&
            req.user?.role !== "DEPT_MANAGER" &&
            req.user?.role !== "PROJECT_MANAGER"
        ) {
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
    async handleFindByLoggedInUserFabricators(req: AuthenticateRequest, res: Response) {
        if (!req.user) {
            throw new AppError('User not found', 404);
        }

        const result = await rfqService.findByLoggedInUserFabricators(req.user.id);
        res.status(200).json({
            status: 'success',
            data: result.rfqs,
            fabricatorIds: result.fabricatorIds,
        });
    }
    async handleCloseRfq(req:AuthenticateRequest,res:Response){
        const {id}=req.params
        const rfq = await rfqService.closeRfq(id);

        (async () => {
          try {
            await notifyMtoClientEstimatorsForRfqStatus(
              rfq.id,
              String(rfq.status),
              rfq.subject,
              { excludeUserIds: req.user?.id ? [req.user.id] : [] }
            );
          } catch (error) {
            console.error("Error in handleCloseRfq MTO notification:", error);
          }
        })();

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

    async handlePendingForClientEstimator(req: AuthenticateRequest, res: Response) {
        if (!req.user) throw new AppError('User not found', 404);
        if (req.user.role !== "CLIENT_ESTIMATOR") {
            throw new AppError("Access denied", 403);
        }
        const rfqs = await rfqService.getRFQsForClientEstimator(req.user.id);
        res.status(200).json({
            status: 'success',
            data: rfqs,
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
