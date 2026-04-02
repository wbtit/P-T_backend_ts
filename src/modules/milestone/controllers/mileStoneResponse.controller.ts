import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { MileStoneResponseService } from "../services";
import { mileStoneResponseStatus } from "@prisma/client";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const mileStoneResponseService = new MileStoneResponseService();
const MILESTONE_NOTIFY_ROLES: UserRole[] = [
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

export class MileStoneResponseController {
  async handleCreateResponse(req: AuthenticateRequest, res: Response) {
    if (!req.user) {
      throw new AppError("User not found", 404);
    }
    const { id: userId } = req.user;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "milestoneresponse"
    );

    const response = await mileStoneResponseService.createResponse(
      {
        ...req.body,
        files: uploadedFiles,
      },
      req.user.id
    );
    const version = await prisma.mileStoneVersion.findUnique({where: {id: req.body?.mileStoneVersionId || (response as any).mileStoneVersionId}});
    const milestone = version ? await prisma.mileStone.findUnique({where: {id: version.mileStoneId}}) : null;
    if (milestone) {
      await notifyProjectStakeholdersByRole(milestone.project_id, MILESTONE_NOTIFY_ROLES, (role) =>
        buildRoleScopedNotification(role, {
          type: "MILESTONE_RESPONSE_RECEIVED",
          basePayload: { milestoneId: milestone.id, milestoneResponseId: response.id, timestamp: new Date() },
          templates: {
            creator: { title: "", message: "" },
            external: { title: "Milestone Response Received", message: "A milestone response was received for your action." },
            oversight: { title: "Milestone Response Received", message: "A milestone response was submitted and is available for review." },
            internal: { title: "Milestone Response Received", message: "A milestone response was submitted in the project." },
            default: { title: "Milestone Response Received", message: "A milestone response was submitted." },
          },
        }),
        { excludeUserIds: [userId] }
      );
    }

    res.status(201).json({
      status: "success",
      message: "MileStone response created",
      data: response,
    });
  }

  async handleUpdateStatus(req: AuthenticateRequest, res: Response) {
    const { parentResponseId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError("status is required", 400);
    }

    const updated = await mileStoneResponseService.updateStatus(
      parentResponseId,
      status as mileStoneResponseStatus
    );
    const version = await prisma.mileStoneVersion.findUnique({where: {id: (updated as any).mileStoneVersionId}});
    const milestone = version ? await prisma.mileStone.findUnique({where: {id: version.mileStoneId}}) : null;
    if (milestone) {
      await notifyProjectStakeholdersByRole(milestone.project_id, MILESTONE_NOTIFY_ROLES, (role) =>
        buildRoleScopedNotification(role, {
          type: status === "DELAYED" ? "MILESTONE_DELAYED" : "MILESTONE_STATUS_UPDATED",
          basePayload: { parentResponseId, status, timestamp: new Date() },
          templates: {
            creator: { title: "", message: "" },
            external: { title: status === "DELAYED" ? "Milestone Delayed" : "Milestone Status Updated", message: `Milestone response status changed to '${status}'.` },
            oversight: { title: status === "DELAYED" ? "Milestone is DELAYED" : "Milestone Status Updated", message: `Milestone response status changed to '${status}'.` },
            internal: { title: status === "DELAYED" ? "Milestone Delayed" : "Milestone Status Updated", message: `Milestone response status changed to '${status}'.` },
            default: { title: status === "DELAYED" ? "Milestone is DELAYED" : "Milestone Status Updated", message: `Milestone response status changed to '${status}'.` },
          },
        }),
        { excludeUserIds: req.user?.id ? [req.user.id] : [] }
      );
    }

    res.status(200).json({
      status: "success",
      message: "MileStone response status updated",
      data: updated,
    });
  }

  async handleGetResponseById(req: Request, res: Response) {
    const { id } = req.params;
    const response = await mileStoneResponseService.getResponseById(id);

    res.status(200).json({
      status: "success",
      data: response,
    });
  }

  async handleViewFile(req: AuthenticateRequest, res: Response) {
    const { responseId, fileId } = req.params;
    await mileStoneResponseService.viewFile(responseId, fileId, res);
  }
}
