import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { COService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";

const coService = new COService();

export class COController {
  // ------------------- CO CREATION & UPDATE -------------------

  async handleCreateCo(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id } = req.user;
    if (!id) throw new AppError("User not found", 404);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "co"
    );

    const coNum = req.body.changeOrderNumber || ""; // optional, could be auto-generated
    const co = await coService.createCo(
      { ...req.body, files: uploadedFiles },
      coNum,
      id
    );

    res.status(201).json({
      status: "success",
      data: co,
    });
  }

  async handleUpdateCo(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id } = req.params;
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "co"
    );

    const updatedCo = await coService.updateCo(id, {
      ...req.body,
      files: uploadedFiles,
    });

    res.status(200).json({
      status: "success",
      data: updatedCo,
    });
  }

  // ------------------- CO FETCHING -------------------

  async handleGetByProjectId(req: Request, res: Response) {
    const { projectId } = req.params;
    const cos = await coService.getByProjectId(projectId);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleSentCos(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;

    const cos = await coService.sentCos(id);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleReceivedCos(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;

    const cos = await coService.receivedCos(id);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  // ------------------- CO TABLE -------------------

  async handleCreateCoTable(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { coId } = req.params;

    const coTable = await coService.createCoTable(req.body, coId, id);
    res.status(201).json({
      status: "success",
      data: coTable,
    });
  }

  async handleUpdateCoTableRow(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { rowId } = req.params;

    const updatedRow = await coService.updateCoTableRow(req.body, rowId, id);
    res.status(200).json({
      status: "success",
      data: updatedRow,
    });
  }

  async handleGetCoTableByCoId(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { coId } = req.params;

    const coRows = await coService.getCoTableByCoId(coId, id);
    res.status(200).json({
      status: "success",
      data: coRows,
    });
  }

  // ------------------- FILE HANDLING -------------------

  async handleGetFile(req: Request, res: Response) {
    const { coId, fileId } = req.params;
    const file = await coService.getFile(coId, fileId);
    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { coId, fileId } = req.params;
    await coService.viewFile(coId, fileId, res);
  }
}
