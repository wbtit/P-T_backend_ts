import { Request, Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { mapUploadedFiles } from "../../../uploads/fileUtil";
import { RFQFollowUpService } from "../services";

const followUpService = new RFQFollowUpService();

export class RFQFollowUpController {
  async handleCreate(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfqfollowup"
    );
    const result = await followUpService.create(req.params.rfqId, req.user.id, {
      ...req.body,
      files: uploadedFiles,
    });
    return res.status(201).json({
      status: "success",
      data: result,
    });
  }

  async handleListByRfq(req: Request, res: Response) {
    const result = await followUpService.getByRfqId(req.params.rfqId);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  }

  async handleGetById(req: Request, res: Response) {
    const result = await followUpService.getById(req.params.id);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  }

  async handleUpdate(req: Request, res: Response) {
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfqfollowup"
    );
    const result = await followUpService.update(req.params.id, {
      ...req.body,
      files: uploadedFiles.length ? uploadedFiles : req.body.files,
    });
    return res.status(200).json({
      status: "success",
      data: result,
    });
  }

  async handleDelete(req: Request, res: Response) {
    const result = await followUpService.delete(req.params.id);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  }

  async handleGetFile(req: Request, res: Response) {
    const { id, fileId } = req.params;
    const file = await followUpService.getFile(id, fileId);
    return res.status(200).json({
      status: "success",
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { id, fileId } = req.params;
    await followUpService.viewFile(id, fileId, res);
  }
}

