import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFIResponseService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

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
    await notifyByRoles(RFI_NOTIFY_ROLES, {
      type: req.body?.parentResponseId ? "RFI_REPLY_ADDED" : "RFI_RESPONSE_RECEIVED",
      title: req.body?.parentResponseId ? "RFI Reply Thread Added" : "RFI Response Received",
      message: "A new RFI response has been submitted.",
      rfiId,
      rfiResponseId: response.id,
      timestamp: new Date(),
    });

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
