import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFIResponseService } from "../services";
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

const rfiResponseService = new RFIResponseService();
const RFI_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "STAFF",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class RFIResponseController {
  // CREATE RFI RESPONSE
  async handleCreateResponse(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;
    const { rfiId } = req.params;

    // map uploaded files (if any)
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfiresponse"
    );

    const response = await rfiResponseService.create(rfiId, userId, {
      ...req.body,
      files: uploadedFiles,
    });
    const [rfiMailContext, responder] = await Promise.all([
      prisma.rFI.findUnique({
        where: { id: rfiId },
        include: {
          project: { select: { name: true } },
          recepients: {
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
          sender: {
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
        where: { id: userId },
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

    if (rfiMailContext && responder) {
      const responseLabel = req.body?.parentResponseId ? "RFI Reply" : "RFI Response";
      const responderName = formatParticipantName(responder);

      await sendResponseParticipantMail({
        sender: rfiMailContext.sender,
        primaryRecipient: rfiMailContext.recepients,
        multipleRecipients: rfiMailContext.multipleRecipients,
        responder,
        subject: `${responseLabel}: ${rfiMailContext.subject}`,
        text: response.reason || `${responseLabel} received for ${rfiMailContext.subject}`,
        buildHtml: ({ greeting, involvedNames }) =>
          responseMailTemplate({
            title: "Project Station - RFI Response",
            projectName: rfiMailContext.project?.name,
            subjectLine: `${responseLabel} - ${rfiMailContext.subject}`,
            greeting,
            intro: `A new ${req.body?.parentResponseId ? "reply" : "response"} has been added to the RFI thread in Project Station. Please find the latest details below:`,
            details: [
              { label: "Reference", value: rfiMailContext.serialNo || "N/A" },
              { label: "Project", value: rfiMailContext.project?.name || "N/A" },
              { label: "Subject", value: rfiMailContext.subject || "N/A" },
              { label: "Response By", value: responderName },
              { label: "Response State", value: response.responseState },
              { label: "WBT Status", value: response.wbtStatus },
              { label: "Reason", value: response.reason || "N/A" },
              { label: "Response Date", value: new Date(response.createdAt).toDateString() },
            ],
            involvedRecipients: involvedNames,
            responderName,
            responderDesignation: responder.designation,
            ctaLabel: "Login to View RFI",
          }),
      });
    }

    const rfi = await prisma.rFI.findUnique({ where: { id: rfiId } });
    if (rfi) {
      const eventType = req.body?.parentResponseId ? "RFI_REPLY_ADDED" : "RFI_RESPONSE_RECEIVED";
      await notifyProjectStakeholdersByRole(rfi.project_id, RFI_NOTIFY_ROLES, (role) =>
        buildRoleScopedNotification(role, {
          type: eventType,
          basePayload: { rfiId, rfiResponseId: response.id, timestamp: new Date() },
          templates: {
            creator: { title: "", message: "" },
            external: { title: req.body?.parentResponseId ? "RFI Reply Received" : "RFI Response Received", message: "A new RFI response was received for your action." },
            oversight: { title: req.body?.parentResponseId ? "RFI Reply Added" : "RFI Response Received", message: "A new RFI response was submitted and is available for review." },
            internal: { title: req.body?.parentResponseId ? "RFI Reply Added" : "RFI Response Received", message: "A new RFI response was submitted in the project." },
            default: { title: req.body?.parentResponseId ? "RFI Reply Added" : "RFI Response Received", message: "A new RFI response was submitted." },
          },
        }),
        { excludeUserIds: [userId] }
      );
    }

    res.status(201).json({
      message: "RFI Response created",
      status: "success",
      data: response,
    });
  }

  // GET RESPONSE BY ID
  async handleGetResponseById(req: Request, res: Response) {
    const { id } = req.params;
    const response = await rfiResponseService.getById(id);

    res.status(200).json({
      status: "success",
      data: response,
    });
  }

  // GET RESPONSES BY PROJECT
  async handleGetResponsesByProject(req: Request, res: Response) {
    const { projectId } = req.params;
    const responses = await rfiResponseService.findByProject(projectId);

    res.status(200).json({
      status: "success",
      data: responses,
    });
  }

  // GET a specific file metadata from response
  async handleGetFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    const file = await rfiResponseService.getFile(responseId, fileId);

    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // STREAM file from response
  async handleViewFile(req: Request, res: Response) {
    const { rfiResId, fileId } = req.params;
    await rfiResponseService.viewFile(rfiResId, fileId, res);
  }
}
