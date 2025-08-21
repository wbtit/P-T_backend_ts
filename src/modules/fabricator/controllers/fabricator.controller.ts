import { Request,Response } from "express";
import { FabricatorService } from "../services";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";

export class FabricatorController {
    fabService= new FabricatorService();

    async handleCreateFabricator(req: AuthenticateRequest, res: Response) {
  const { body } = req;
  const userId = req.user?.id;
  if (!userId) throw new AppError("createdById is required", 400);
  const uploadedFiles = mapUploadedFiles(
    (req.files as Express.Multer.File[]) || [],
    "fabricators"
  );
  const payload = {
    ...body,
    files: uploadedFiles,
  };

  const fabricator = await this.fabService.createFabricator(payload, userId);
  res.status(201).json(fabricator);
}
}