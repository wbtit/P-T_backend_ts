import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { SubmittalResponseService } from "../services";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { State } from "@prisma/client";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const submittalResponseService = new SubmittalResponseService();
const SUBMITTAL_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class SubmittalResponseController {

  // --------------------------------------------------
  // CREATE SUBMITTAL RESPONSE (VERSION-AWARE)
  // --------------------------------------------------
  async handleCreateResponse(
    req: AuthenticateRequest,
    res: Response
  ) {
    if (!req.user) {
      throw new AppError("User not found", 404);
    }

    const { id: userId } = req.user;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittalsresponse"
    );

    const {
      submittalsId,
      submittalVersionId,
      parentResponseId,
      description,
      reason,
      status,
      wbtStatus,
    } = req.body;

    if (!submittalsId || !submittalVersionId) {
      throw new AppError(
        "submittalsId and submittalVersionId are required",
        400
      );
    }

    const response = await submittalResponseService.createResponse(
      {
        submittalsId,
        submittalVersionId,
        parentResponseId,
        description,
        reason,
        status,
        wbtStatus,
        files: uploadedFiles,
      },
      userId
    );
    const submittal = await prisma.submittals.findUnique({ where: { id: submittalsId } });
    if (submittal) {
      await notifyProjectStakeholdersByRole(submittal.project_id, SUBMITTAL_NOTIFY_ROLES, (role) =>
        buildRoleScopedNotification(role, {
          type: "SUBMITTAL_RESPONSE_RECEIVED",
          basePayload: { submittalsId, submittalResponseId: response.id, timestamp: new Date() },
          templates: {
            creator: { title: "", message: "" },
            external: { title: "Submittal Response Received", message: "A new submittal response was received for your action." },
            oversight: { title: "Submittal Response Received", message: "A new submittal response was submitted and is available for review." },
            internal: { title: "Submittal Response Received", message: "A new submittal response was submitted in the project." },
            default: { title: "Submittal Response Received", message: "A new submittal response has been submitted." },
          },
        }),
        { excludeUserIds: [userId] }
      );
    }

    res.status(201).json({
      status: "success",
      message: "Submittal response created",
      data: response,
    });
  }

  // --------------------------------------------------
  // UPDATE WORKFLOW STATUS (THREAD)
  // --------------------------------------------------
  async handleUpdateStatus(
    req: AuthenticateRequest,
    res: Response
  ) {
    const { parentResponseId } = req.params;
    const { status } = req.body;

    if (!parentResponseId) {
      throw new AppError("parentResponseId is required", 400);
    }

    if (!status) {
      throw new AppError("status is required", 400);
    }

    const updated = await submittalResponseService.updateStatus(
      parentResponseId,
      status as State
    );
    const submittal = await prisma.submittals.findUnique({ where: { id: (updated as any).submittalsId } });
    if (submittal) {
      await notifyProjectStakeholdersByRole(submittal.project_id, SUBMITTAL_NOTIFY_ROLES, (role) =>
        buildRoleScopedNotification(role, {
          type: "SUBMITTAL_STATUS_UPDATED",
          basePayload: { parentResponseId, status, timestamp: new Date() },
          templates: {
            creator: { title: "", message: "" },
            external: { title: "Submittal Status Updated", message: `Submittal workflow status changed to '${status}'.` },
            oversight: { title: "Submittal Status Updated", message: `Submittal workflow status changed to '${status}'.` },
            internal: { title: "Submittal Status Updated", message: `Submittal workflow status changed to '${status}'.` },
            default: { title: "Submittal Status Updated", message: `Submittal workflow status updated to '${status}'.` },
          },
        }),
        { excludeUserIds: req.user?.id ? [req.user.id] : [] }
      );
    }

    res.status(200).json({
      status: "success",
      message: "Workflow status updated",
      data: updated,
    });
  }

  // --------------------------------------------------
  // GET RESPONSE BY ID
  // --------------------------------------------------
  async handleGetResponseById(
    req: Request,
    res: Response
  ) {
    const { id } = req.params;

    const response =
      await submittalResponseService.getResponseById(id);

    res.status(200).json({
      status: "success",
      data: response,
    });
  }

  // --------------------------------------------------
  // STREAM RESPONSE FILE
  // --------------------------------------------------
  async handleViewFile(
    req: AuthenticateRequest,
    res: Response
  ) {
    const { responseId, fileId } = req.params;

    await submittalResponseService.viewFile(
      responseId,
      fileId,
      res
    );
  }
}
