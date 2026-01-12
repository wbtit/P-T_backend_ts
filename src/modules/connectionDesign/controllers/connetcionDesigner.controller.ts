import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";

import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";

import { ConnectionDesignerService } from "../services";

export class ConnectionDesignerController {
  cdService = new ConnectionDesignerService();

  // -------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------
  async handleCreateConnectionDesigner(req: AuthenticateRequest, res: Response) {
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [],
      "connectionDesigners"
    );
    const certificates = mapUploadedFiles(
      (req.files as { [fieldname: string]: Express.Multer.File[] })?.certificates || [],
      "certificates"
    )

    const payload = {
      ...body,
      files: uploadedFiles,
      certificates:certificates
    };

    const designer = await this.cdService.createConnectionDesigner(payload);

    return res.status(201).json({
      message: "Connection Designer created successfully",
      success: true,
      data: designer,
    });
  }

  // -------------------------------------------------------------------
  // Get all
  // -------------------------------------------------------------------
  async handleGetAllConnectionDesigners(req: Request, res: Response) {
    const designers = await this.cdService.getAllConnectionDesigners();

    return res.status(200).json({
      message: "Connection Designers fetched successfully",
      success: true,
      data: designers,
    });
  }

  // -------------------------------------------------------------------
  // Get by ID
  // -------------------------------------------------------------------
  async handleGetConnectionDesignerById(req: Request, res: Response) {
    const { id } = req.params;

    const designer = await this.cdService.getConnectionDesignerById(id);
    if (!designer) throw new AppError("Connection Designer not found", 404);

    return res.status(200).json({
      message: "Connection Designer fetched successfully",
      success: true,
      data: designer,
    });
  }

  // -------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------
  async handleUpdateConnectionDesigner(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [],
      "connectionDesigners"
    );
    const certificates = mapUploadedFiles(
      (req.files as { [fieldname: string]: Express.Multer.File[] })?.certificates || [],
      "certificates"
    )

    const payload = {
      ...body,
      files: uploadedFiles,
      certificates:certificates
    };

    const updated = await this.cdService.updateConnectionDesigner(id, payload);

    return res.status(200).json({
      message: "Connection Designer updated successfully",
      success: true,
      data: updated,
    });
  }

  // -------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------
  async handleDeleteConnectionDesigner(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    await this.cdService.deleteConnectionDesigner(id);

    return res.status(200).json({
      message: "Connection Designer deleted successfully",
      success: true,
    });
  }

  // -------------------------------------------------------------------
  // Get File metadata
  // -------------------------------------------------------------------
  async handleGetFile(req: Request, res: Response) {
    const { designerId, fileId } = req.params;

    const file = await this.cdService.getFile(designerId, fileId);

    return res.status(200).json({
      message: "File fetched successfully",
      success: true,
      data: file,
    });
  }

  // -------------------------------------------------------------------
  // Stream/View File
  // -------------------------------------------------------------------
  async handleViewFile(req: Request, res: Response) {
    const { designerId, fileId } = req.params;

    // Direct stream – no JSON response wrapper
    await this.cdService.viewFile(designerId, fileId, res);
  }

  // -------------------------------------------------------------------
  // Delete File from object list
  // -------------------------------------------------------------------
  async handleDeleteFile(req: Request, res: Response) {
    const { designerId, fileId } = req.params;

    await this.cdService.deleteFile(designerId, fileId);

    return res.status(204).send();
  }
}
