import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { AppError } from "../../../../config/utils/AppError";
import { mapUploadedFiles } from "../../../uploads/fileUtil";
import { EstimationResponseService } from "../services";

const estimationResponseService = new EstimationResponseService();

export class EstimationResponseController {
  async handleCreate(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;
    const { estimationId } = req.params;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "estimationresponse"
    );

    const payload = {
      ...req.body,
      files: uploadedFiles,
    };

    const result = await estimationResponseService.create(estimationId, userId, payload);

    return res.status(201).json({
      success: true,
      data: result,
    });
  }

  async handleGetById(req: Request, res: Response) {
    const result = await estimationResponseService.getById({ id: req.params.id });
    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  async handleGetFile(req: Request, res: Response) {
    const { estimationResId, fileId } = req.params;
    const file = await estimationResponseService.getFile(estimationResId, fileId);
    return res.status(200).json({
      success: true,
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { estimationResId, fileId } = req.params;
    await estimationResponseService.viewFile(estimationResId, fileId, res);
  }
}
