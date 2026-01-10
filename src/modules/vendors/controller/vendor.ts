import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";

import { VendorService } from "../services";

export class VendorController {
  vendorService = new VendorService();

  // -------------------------------------------------------------------
  // Create Vendor
  // -------------------------------------------------------------------
  async handleCreateVendor(req: AuthenticateRequest, res: Response) {
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const vendor = await this.vendorService.createVendor({
      ...body,
      createdById: userId,
    });

    return res.status(201).json({
      message: "Vendor created successfully",
      success: true,
      data: vendor,
    });
  }

  // -------------------------------------------------------------------
  // Get All Vendors
  // -------------------------------------------------------------------
  async handleGetAllVendors(_req: Request, res: Response) {
    const vendors = await this.vendorService.getAllVendors();

    return res.status(200).json({
      message: "Vendors fetched successfully",
      success: true,
      data: vendors,
    });
  }

  // -------------------------------------------------------------------
  // Get Vendor By ID
  // -------------------------------------------------------------------
  async handleGetVendorById(req: Request, res: Response) {
    const { id } = req.params;

    const vendor = await this.vendorService.getVendorById(id);

    return res.status(200).json({
      message: "Vendor fetched successfully",
      success: true,
      data: vendor,
    });
  }

  // -------------------------------------------------------------------
  // Update Vendor
  // -------------------------------------------------------------------
  async handleUpdateVendor(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("updatedById is required", 400);

    const updatedVendor = await this.vendorService.updateVendor(id, {
      ...body,
      updatedById: userId,
    });

    return res.status(200).json({
      message: "Vendor updated successfully",
      success: true,
      data: updatedVendor,
    });
  }

  // -------------------------------------------------------------------
  // Delete Vendor (Soft Delete)
  // -------------------------------------------------------------------
  async handleDeleteVendor(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("deletedById is required", 400);

    await this.vendorService.deleteVendor(id);

    return res.status(200).json({
      message: "Vendor deleted successfully",
      success: true,
    });
  }

  // -------------------------------------------------------------------
  // Get Vendor File Metadata
  // -------------------------------------------------------------------
  async handleGetFile(req: Request, res: Response) {
    const { vendorId, fileId } = req.params;

    const file = await this.vendorService.getFile(vendorId, fileId);

    return res.status(200).json({
      message: "File fetched successfully",
      success: true,
      data: file,
    });
  }

  // -------------------------------------------------------------------
  // View Vendor File (Stream)
  // -------------------------------------------------------------------
  async handleViewFile(req: Request, res: Response) {
    const { vendorId, fileId } = req.params;

    return this.vendorService.viewFile(vendorId, fileId, res);
  }

  // -------------------------------------------------------------------
  // Delete Vendor File
  // -------------------------------------------------------------------
  async handleDeleteFile(req: AuthenticateRequest, res: Response) {
    const { vendorId, fileId } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("deletedById is required", 400);

    const vendor = await this.vendorService.deleteFile(vendorId, fileId);

    return res.status(200).json({
      message: "File deleted successfully",
      success: true,
      data: vendor,
    });
  }

  // -------------------------------------------------------------------
  // Delete Vendor Certificate
  // -------------------------------------------------------------------
  async handleDeleteCertificate(req: AuthenticateRequest, res: Response) {
    const { vendorId, certificateId } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("deletedById is required", 400);

    const vendor = await this.vendorService.deleteCertificate(
      vendorId,
      certificateId
    );

    return res.status(200).json({
      message: "Certificate deleted successfully",
      success: true,
      data: vendor,
    });
  }
}
