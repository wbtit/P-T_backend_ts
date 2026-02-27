import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { MileStoneResponseService } from "../services";
import { mileStoneResponseStatus } from "@prisma/client";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

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
    await notifyByRoles(MILESTONE_NOTIFY_ROLES, {
      type: "MILESTONE_RESPONSE_RECEIVED",
      title: "Milestone Response Received",
      message: "A milestone response was submitted.",
      milestoneId: req.body?.mileStoneId,
      milestoneResponseId: response.id,
      timestamp: new Date(),
    });

    res.status(201).json({
      status: "success",
      message: "MileStone response created",
      data: response,
    });
  }

  async handleUpdateStatus(req: Request, res: Response) {
    const { parentResponseId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError("status is required", 400);
    }

    const updated = await mileStoneResponseService.updateStatus(
      parentResponseId,
      status as mileStoneResponseStatus
    );
    await notifyByRoles(MILESTONE_NOTIFY_ROLES, {
      type: status === "DELAYED" ? "MILESTONE_DELAYED" : "MILESTONE_STATUS_UPDATED",
      title: status === "DELAYED" ? "Milestone is DELAYED" : "Milestone Status Updated",
      message: `Milestone response status changed to '${status}'.`,
      parentResponseId,
      status,
      timestamp: new Date(),
    });

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
