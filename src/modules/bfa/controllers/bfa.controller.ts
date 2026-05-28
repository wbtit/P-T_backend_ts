import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { BfaService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";

const bfaService = new BfaService();

export class BfaController {
  async handleCreateBfa(req: AuthenticateRequest, res: Response) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "bfa"
    );

    const bfa = await bfaService.createBfa(req.body, uploadedFiles, user.id);

    res.status(201).json({
      status: "success",
      message: "BFA created successfully with initial version (v1)",
      data: bfa,
    });
  }

  async handleUpdateBfa(req: AuthenticateRequest, res: Response) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const { id } = req.params;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "bfa"
    );

    const bfa = await bfaService.updateBfa(id, req.body, uploadedFiles, user.id);

    res.status(200).json({
      status: "success",
      message: `BFA updated successfully. Bumps to version v${bfa.bfaVersion}`,
      data: bfa,
    });
  }

  async handleDeleteBfa(req: Request, res: Response) {
    const { id } = req.params;
    await bfaService.deleteBfa(id);

    res.status(200).json({
      status: "success",
      message: "BFA deleted successfully",
    });
  }

  async handleGetBfaById(req: Request, res: Response) {
    const { id } = req.params;
    const bfa = await bfaService.getBfaById(id);

    res.status(200).json({
      status: "success",
      data: bfa,
    });
  }

  async handleGetBfaBySubmittalId(req: Request, res: Response) {
    const { submittalId } = req.params;
    const bfa = await bfaService.getBfaBySubmittalId(submittalId);

    res.status(200).json({
      status: "success",
      data: bfa,
    });
  }

  async handleListBfas(req: Request, res: Response) {
    const bfas = await bfaService.listBfas();

    res.status(200).json({
      status: "success",
      data: bfas,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { bfaId, fileId } = req.params;
    await bfaService.viewFile(bfaId, fileId, res);
  }
}
