import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";

import { AppError } from "../../../config/utils/AppError";
import { VendorQuotaService } from "../services";

export class VendorQuotaController {
  quotaService = new VendorQuotaService();

  // -------------------------------------------------------------------
  // Create Quota
  // -------------------------------------------------------------------
  async handleCreateQuota(req: AuthenticateRequest, res: Response) {
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const quota = await this.quotaService.createQuota({
      ...body,
      createdById: userId,
    });

    return res.status(201).json({
      message: "Vendor Quota created successfully",
      success: true,
      data: quota,
    });
  }

  // -------------------------------------------------------------------
  // Get All Quotas
  // -------------------------------------------------------------------
  async handleGetAllQuotas(_req: Request, res: Response) {
    const quotas = await this.quotaService.getAllQuotas();

    return res.status(200).json({
      message: "Vendor Quotas fetched successfully",
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
      message: "Vendor Quota fetched successfully",
      success: true,
      data: quota,
    });
  }

  // -------------------------------------------------------------------
  // Get Quotas by Vendor ID
  // -------------------------------------------------------------------
  async handleGetQuotasByVendorId(req: Request, res: Response) {
    const { vendorId } = req.params;

    const quotas = await this.quotaService.getQuotasByVendorId(vendorId);

    return res.status(200).json({
      message: "Vendor Quotas fetched successfully",
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

    const updatedQuota = await this.quotaService.updateQuota(
      { id },
      {
        ...body,
        updatedById: userId,
      }
    );

    return res.status(200).json({
      message: "Vendor Quota updated successfully",
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
      message: "Vendor Quota approved successfully",
      success: true,
      data: approved,
    });
  }

  // -------------------------------------------------------------------
  // Delete Quota (Soft Delete)
  // -------------------------------------------------------------------
  async handleDeleteQuota(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("deletedById is required", 400);

    await this.quotaService.deleteQuota({ id });

    return res.status(200).json({
      message: "Vendor Quota deleted successfully",
      success: true,
    });
  }
}
