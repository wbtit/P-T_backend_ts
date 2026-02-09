import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";

import { ConnectionDesignerQuotaService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";

export class ConnectionDesignerQuotaController {
  quotaService = new ConnectionDesignerQuotaService();

  // -------------------------------------------------------------------
  // Create Quota
  // -------------------------------------------------------------------
  async handleCreateQuota(req: AuthenticateRequest, res: Response) {
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "connectiondesignerQuotation"
    );

    const quota = await this.quotaService.createQuota({
      ...body,
      createdById: userId,
      ...(uploadedFiles.length > 0 ? { files: uploadedFiles } : {}),
    });

    return res.status(201).json({
      message: "Connection Designer Quota created successfully",
      success: true,
      data: quota,
    });
  }

  // -------------------------------------------------------------------
  // Get All Quotas
  // -------------------------------------------------------------------
  async handleGetAllQuotas(req: Request, res: Response) {
    const quotas = await this.quotaService.getAllQuotas();

    return res.status(200).json({
      message: "Connection Designer Quotas fetched successfully",
      success: true,
      data: quotas,
    });
  }

  // -------------------------------------------------------------------
  // Get Quota By ID
  // -------------------------------------------------------------------
  async handleGetQuotaById(req: Request, res: Response) {
    const { id } = req.params;

    const quota = await this.quotaService.getQuotaById({ id });

    return res.status(200).json({
      message: "Connection Designer Quota fetched successfully",
      success: true,
      data: quota,
    });
  }

  // -------------------------------------------------------------------
  // Get Quotas by Designer ID
  // -------------------------------------------------------------------
  async handleGetQuotasByDesignerId(req: Request, res: Response) {
    const { designerId } = req.params;

    const quotas = await this.quotaService.getQuotasByDesignerId(designerId);

    return res.status(200).json({
      message: "Connection Designer Quotas fetched successfully",
      success: true,
      data: quotas,
    });
  }

  // -------------------------------------------------------------------
  // Update Quota
  // -------------------------------------------------------------------
  async handleUpdateQuota(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("updatedById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "connectiondesignerQuotation"
    );

    const updatedQuota = await this.quotaService.updateQuota(
      { id },
      {
        ...body,
        updatedById: userId,
        ...(uploadedFiles.length > 0 ? { files: uploadedFiles } : {}),
      }
    );

    return res.status(200).json({
      message: "Connection Designer Quota updated successfully",
      success: true,
      data: updatedQuota,
    });
  }

  // -------------------------------------------------------------------
  // Approve Quota
  // -------------------------------------------------------------------
  async handleApproveQuota(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const approverId = req.user?.id;

    if (!approverId) throw new AppError("approverId is required", 400);

    const approved = await this.quotaService.approveQuota(id, approverId);

    return res.status(200).json({
      message: "Quota approved successfully",
      success: true,
      data: approved,
    });
  }

  // -------------------------------------------------------------------
  // Delete Quota
  // -------------------------------------------------------------------
  async handleDeleteQuota(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("deletedById is required", 400);

    await this.quotaService.deleteQuota({ id });

    return res.status(200).json({
      message: "Connection Designer Quota deleted successfully",
      success: true,
    });
  }

  // -------------------------------------------------------------------
  // Get File (Meta)
  // -------------------------------------------------------------------
  async handleGetFile(req: AuthenticateRequest, res: Response) {
    const { quotaId, fileId } = req.params;

    const file = await this.quotaService.getFile(quotaId, fileId);

    return res.status(200).json({
      message: "Connection Designer Quota file fetched successfully",
      success: true,
      data: file,
    });
  }

  // -------------------------------------------------------------------
  // View / Stream File
  // -------------------------------------------------------------------
  async handleViewFile(req: AuthenticateRequest, res: Response) {
    const { quotaId, fileId } = req.params;
    return this.quotaService.viewFile(quotaId, fileId, res);
  }
}

