import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { CoResponseService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";
import { responseMailTemplate } from "../../../services/mailServices/mailtemplates/responseMailTemplate";
import {
  formatParticipantName,
  sendResponseParticipantMail,
} from "../../../services/mailServices/responseMailUtils";

const coResponseService = new CoResponseService();
const CO_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "CONNECTION_DESIGNER_ADMIN",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class CoResponseController {
  // CREATE CO RESPONSE
  async handleCreateCoResponse(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;
    const { coId } = req.params;
    const { changeOrderVersionId } = req.body;

    if (req.user?.role === "CLIENT" || req.user?.role === "CLIENT_ADMIN") {
      const co = await prisma.changeOrder.findUnique({
        where: { id: coId },
        include: { Project: true }
      });
      if (!co || co.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to respond to this change order until it is approved", 403);
      }
      if (req.user?.role === "CLIENT_ADMIN") {
        const fabricators = await prisma.fabricator.findMany({
          where: {
            pointOfContact: {
              some: { id: req.user.id, role: "CLIENT_ADMIN" },
            },
          },
          select: { id: true },
        });
        const fabricatorIds = fabricators.map((f) => f.id);
        if (!fabricatorIds.includes(co.Project.fabricatorID)) {
          throw new AppError("Access denied: This change order does not belong to your fabricator", 403);
        }
      } else {
        const project = await prisma.project.findFirst({
          where: {
            id: co.project,
            clientProjectManagers: { some: { id: req.user.id } }
          }
        });
        if (!project) {
          throw new AppError("Access denied: You are not assigned to this project", 403);
        }
      }
    }

    // map uploaded files (if any)
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "coresponse"
    );

    const response = await coResponseService.createCoResponse(
      {
        ...req.body,
        files: uploadedFiles,
      },
      coId,
      userId,
      changeOrderVersionId
    );
    const responderId = userId;
    const parentRespId = req.body?.parentResponseId;
    const respStatus = (response as any)?.Status;

    // Background non-blocking tasks
    (async () => {
      try {
        const [coMailContext, responder] = await Promise.all([
          prisma.changeOrder.findUnique({
            where: { id: coId },
            include: {
              Project: { select: { name: true } },
              Recipients: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  username: true,
                  designation: true,
                },
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
                },
              },
              senders: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  username: true,
                  designation: true,
                },
              },
            },
          }),
          prisma.user.findUnique({
            where: { id: responderId },
            select: {
              id: true,
              email: true,
              firstName: true,
              middleName: true,
              lastName: true,
              username: true,
              designation: true,
            },
          }),
        ]);

        if (coMailContext && responder) {
          const responseLabel = parentRespId ? "Change Order Reply" : "Change Order Response";
          const responderName = formatParticipantName(responder);

          await sendResponseParticipantMail({
            sender: coMailContext.senders,
            primaryRecipient: coMailContext.Recipients,
            multipleRecipients: coMailContext.multipleRecipients,
            responder,
            subject: `${responseLabel}: ${coMailContext.changeOrderNumber || coMailContext.serialNo || "Change Order"}`,
            text: response.description || `${responseLabel} received for ${coMailContext.changeOrderNumber || "Change Order"}`,
            buildHtml: ({ greeting, involvedNames }) =>
              responseMailTemplate({
                title: "Project Station - Change Order Response",
                projectName: coMailContext.Project?.name,
                subjectLine: `${responseLabel} - ${coMailContext.changeOrderNumber || "Change Order"}`,
                greeting,
                intro: `A new ${parentRespId ? "reply" : "response"} has been added to the Change Order thread in Project Station. Please review the latest update below:`,
                details: [
                  { label: "CO Number", value: coMailContext.changeOrderNumber || "N/A" },
                  { label: "Project", value: coMailContext.Project?.name || "N/A" },
                  { label: "Stage", value: coMailContext.stage },
                  { label: "Response By", value: responderName },
                  { label: "Description", value: response.description || "N/A" },
                  { label: "Response Date", value: new Date(response.createdAt).toDateString() },
                ],
                involvedRecipients: involvedNames,
                responderName,
                responderDesignation: responder.designation,
                ctaLabel: "Login to View Change Order",
              }),
          });
        }

        const co = await prisma.changeOrder.findUnique({ where: { id: coId } });
        if (co) {
          const type =
            respStatus === "ACCEPT"
              ? "CO_ACCEPTED_BY_FABRICATOR"
              : respStatus === "REJECT"
              ? "CO_REJECTED_BY_FABRICATOR"
              : "CO_RESPONSE_RECEIVED";
          await notifyProjectStakeholdersByRole(co.project, CO_NOTIFY_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type,
              basePayload: { coId, coResponseId: response.id, status: respStatus, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "Change Order Response Received", message: "A change-order response was received for your action." },
                oversight: { title: "Change Order Response Received", message: "A change-order response was submitted and is available for review." },
                internal: { title: "Change Order Response Received", message: "A change-order response was submitted in the project." },
                default: { title: "CO Response / Reply Received", message: "A change-order response was submitted." },
              },
            }),
            { excludeUserIds: [responderId] }
          );
        }
      } catch (error) {
        console.error("Error in handleCreateCoResponse background tasks:", error);
      }
    })();

    res.status(201).json({
      message: "CO Response created",
      status: "success",
      data: response,
    });
  }

  // GET CO RESPONSE BY ID
  async handleGetResponseById(req: Request, res: Response) {
    const authReq = req as AuthenticateRequest;
    const { id } = req.params;
    const response = await coResponseService.getResponseById(id);

    if (authReq.user?.role === "CLIENT" || authReq.user?.role === "CLIENT_ADMIN") {
      const co = response?.CoId ? await prisma.changeOrder.findUnique({ where: { id: response.CoId } }) : null;
      if (!co || co.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to view this response until it is approved", 403);
      }
    }

    res.status(200).json({
      status: "success",
      data: response,
    });
  }

  // GET all responses by CO ID
  async handleGetResponsesByCoId(req: Request, res: Response) {
    const authReq = req as AuthenticateRequest;
    const { coId } = req.params;

    if (authReq.user?.role === "CLIENT" || authReq.user?.role === "CLIENT_ADMIN") {
      const co = await prisma.changeOrder.findUnique({ where: { id: coId } });
      if (!co || co.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to view responses for this change order until it is approved", 403);
      }
    }

    const responses = await coResponseService.findByCoId(coId);

    res.status(200).json({
      status: "success",
      data: responses,
    });
  }

  // GET a specific file metadata from response
  async handleGetFile(req: Request, res: Response) {
    const authReq = req as AuthenticateRequest;
    const { responseId, fileId } = req.params;
    const response = await coResponseService.getResponseById(responseId);

    if (authReq.user?.role === "CLIENT" || authReq.user?.role === "CLIENT_ADMIN") {
      const co = response?.CoId ? await prisma.changeOrder.findUnique({ where: { id: response.CoId } }) : null;
      if (!co || co.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to view files for this response until it is approved", 403);
      }
    }

    const file = await coResponseService.getFile(responseId, fileId);

    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // STREAM file from response
  async handleViewFile(req: Request, res: Response) {
    const authReq = req as AuthenticateRequest;
    const { responseId, fileId } = req.params;
    const response = await coResponseService.getResponseById(responseId);

    if (authReq.user?.role === "CLIENT" || authReq.user?.role === "CLIENT_ADMIN") {
      const co = response?.CoId ? await prisma.changeOrder.findUnique({ where: { id: response.CoId } }) : null;
      if (!co || co.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to view files for this response until it is approved", 403);
      }
    }

    await coResponseService.viewFile(responseId, fileId, res);
  }
}
