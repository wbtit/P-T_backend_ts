import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { SubmittalResponseService } from "../services";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { State } from "@prisma/client";

const submittalResponseService = new SubmittalResponseService();

export class SubmittalResponseController {
  // CREATE SUBMITTAL RESPONSE
  async handleCreateResponse(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;

    // map uploaded files (if any)
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittalResponse"
    );

    const response = await submittalResponseService.createResponse(
      { ...req.body, files: uploadedFiles },
      userId
    );

    res.status(201).json({
      message: "Submittal Response created",
      status: "success",
      data: response,
    });
  }

  // UPDATE STATUS of a submittal response
  async handleUpdateStatus(req: Request, res: Response) {
    const { parentResponseId } = req.params;
    const { status } = req.body;

    if (!status) throw new AppError("Status is required", 400);

    const updated = await submittalResponseService.updateStatus(
      parentResponseId,
      status as State
    );

    res.status(200).json({
      message: "Status updated",
      status: "success",
      data: updated,
    });
  }

  // GET RESPONSE BY ID
  async handleGetResponseById(req: Request, res: Response) {
    const { id } = req.params;
    const response = await submittalResponseService.getResponseById(id);

    res.status(200).json({
      status: "success",
      data: response,
    });
  }

  // GET specific file metadata
  async handleGetFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    const file = await submittalResponseService.getFile(responseId, fileId);

    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // STREAM file content
  async handleViewFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    await submittalResponseService.viewFile(responseId, fileId, res);
  }
}
