import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { CoResponseService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";
import { sendNotification } from "../../../utils/sendNotification";
import { buildCreatorNotification, buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const coResponseService = new CoResponseService();
const CO_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
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
      userId
    );
    const status = (response as any)?.Status;
    const co = await prisma.changeOrder.findUnique({ where: { id: coId } });
    if (co) {
      const type =
        status === "ACCEPT"
          ? "CO_ACCEPTED_BY_FABRICATOR"
          : status === "REJECT"
          ? "CO_REJECTED_BY_FABRICATOR"
          : "CO_RESPONSE_RECEIVED";
      await sendNotification(userId, buildCreatorNotification(type, {
        title: "Change Order Response Submitted",
        message: "You submitted a change-order response.",
      }, {
        coId,
        coResponseId: response.id,
        status,
        timestamp: new Date(),
      }));
      await notifyProjectStakeholdersByRole(co.project, CO_NOTIFY_ROLES, (role) =>
        buildRoleScopedNotification(role, {
          type,
          basePayload: { coId, coResponseId: response.id, status, timestamp: new Date() },
          templates: {
            creator: { title: "", message: "" },
            external: { title: "Change Order Response Received", message: "A change-order response was received for your action." },
            oversight: { title: "Change Order Response Received", message: "A change-order response was submitted and is available for review." },
            internal: { title: "Change Order Response Received", message: "A change-order response was submitted in the project." },
            default: { title: "CO Response / Reply Received", message: "A change-order response was submitted." },
          },
        }),
        { excludeUserIds: [userId] }
      );
    }

    res.status(201).json({
      message: "CO Response created",
      status: "success",
      data: response,
    });
  }

  // GET CO RESPONSE BY ID
  async handleGetResponseById(req: Request, res: Response) {
    const { id } = req.params;
    const response = await coResponseService.getResponseById(id);

    res.status(200).json({
      status: "success",
      data: response,
    });
  }

  // GET all responses by CO ID
  async handleGetResponsesByCoId(req: Request, res: Response) {
    const { coId } = req.params;
    const responses = await coResponseService.findByCoId(coId);

    res.status(200).json({
      status: "success",
      data: responses,
    });
  }

  // GET a specific file metadata from response
  async handleGetFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    const file = await coResponseService.getFile(responseId, fileId);

    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // STREAM file from response
  async handleViewFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    await coResponseService.viewFile(responseId, fileId, res);
  }
}
