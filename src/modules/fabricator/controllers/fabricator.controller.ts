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
    async handleGetAllFabricators(req: Request, res: Response) {
        const fabricators = await this.fabService.getAllFabricators();
        res.status(200).json(fabricators);
    }
    async handleGetFabricatorById(req: Request, res: Response) {
        const { id } = req.params;
        const fabricator = await this.fabService.getFabricatorById(id);
        if (!fabricator) throw new AppError("Fabricator not found", 404);
        res.status(200).json(fabricator);
    }
    async handleGetFabricatorByCreatedById(req: AuthenticateRequest, res: Response) {
        const { id } = req.params;
        const fabricators = await this.fabService.getFabricatorByCreatedById(id);
        if (!fabricators) throw new AppError("Fabricators not found", 404);
        res.status(200).json(fabricators);
    }
    async handleUpdateFabricator(req: AuthenticateRequest, res: Response) {
        const { id } = req.params;
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
        const fabricator = await this.fabService.updateFabricator(id, payload);
        res.status(200).json(fabricator);
    }
    async handleDeleteFabricator(req: AuthenticateRequest, res: Response) {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) throw new AppError("createdById is required", 400);
        await this.fabService.deleteFabricator(id);
        res.status(204).send();
    }
    async handleGetFile(req: Request, res: Response) {
        const { fabricatorId, fileId } = req.params;
        await this.fabService.getFile(fabricatorId, fileId);
    }
    async handleViewFile(req: Request, res: Response) {
        const { fabricatorId, fileId } = req.params;
        await this.fabService.viewFile(fabricatorId, fileId, res);
    }   
}