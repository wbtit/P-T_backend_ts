import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { MileStoneResponseService } from "../services";
import { mileStoneResponseStatus } from "@prisma/client";

const mileStoneResponseService = new MileStoneResponseService();

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
