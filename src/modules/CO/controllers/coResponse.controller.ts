import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { CoResponseService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

const coResponseService = new CoResponseService();
const CO_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
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
    await notifyByRoles(CO_NOTIFY_ROLES, {
      type:
        status === "ACCEPT"
          ? "CO_ACCEPTED_BY_FABRICATOR"
          : status === "REJECT"
          ? "CO_REJECTED_BY_FABRICATOR"
          : "CO_RESPONSE_RECEIVED",
      title:
        status === "ACCEPT"
          ? "Change Order Accepted by Fabricator"
          : status === "REJECT"
          ? "Change Order Rejected by Fabricator"
          : "CO Response / Reply Received",
      message: "A change-order response was submitted.",
      coId,
      coResponseId: response.id,
      status,
      timestamp: new Date(),
    });

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
