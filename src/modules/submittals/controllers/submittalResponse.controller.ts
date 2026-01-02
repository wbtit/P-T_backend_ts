import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { SubmittalResponseService } from "../services";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { State } from "@prisma/client";

const submittalResponseService = new SubmittalResponseService();

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
    req: Request,
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
