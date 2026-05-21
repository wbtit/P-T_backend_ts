import { Request, Response } from "express";
import { InvoiceWireTransferService } from "../services";
import {
  CreateInvoiceWireTransferSchema,
  UpdateInvoiceWireTransferSchema,
} from "../dtos";
import { asyncHandler } from "../../../config/utils/asyncHandler";
import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { mapUploadedFiles } from "../../uploads/fileUtil";

export class InvoiceWireTransferController {
  private service = new InvoiceWireTransferService();

  handleCreate = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new AppError("User not authenticated", 401);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "invoicewiretransfer"
    );

    const payload = CreateInvoiceWireTransferSchema.parse({
      ...req.body,
      files: uploadedFiles.length ? uploadedFiles : req.body.files,
    });
    const result = await this.service.create(payload, userId);
    return res.status(201).json({
      message: "Invoice wire transfer created successfully",
      success: true,
      data: result,
    });
  });

  handleUpdate = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "invoicewiretransfer"
    );

    const payload = UpdateInvoiceWireTransferSchema.parse({
      ...req.body,
      files: uploadedFiles.length ? uploadedFiles : req.body.files,
    });
    const result = await this.service.update(id, payload);
    return res.status(200).json({
      message: "Invoice wire transfer updated successfully",
      success: true,
      data: result,
    });
  });

  handleGetById = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const result = await this.service.get({ id });
    return res.status(200).json({
      message: "Invoice wire transfer fetched successfully",
      success: true,
      data: result,
    });
  });

  handleDelete = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);
    return res.status(200).json({
      message: "Invoice wire transfer deleted successfully",
      success: true,
    });
  });

  handleGetAll = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const results = await this.service.getAll();
    return res.status(200).json({
      message: "Invoice wire transfers fetched successfully",
      success: true,
      data: results,
    });
  });

  handleGetByInvoiceId = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { invoiceId } = req.params;
    const results = await this.service.getByInvoiceId(invoiceId);
    return res.status(200).json({
      message: "Invoice wire transfers fetched successfully",
      success: true,
      data: results,
    });
  });

  handleGetMyTransfers = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new AppError("User not authenticated", 401);

    const results = await this.service.getByCreatedBy(userId);
    return res.status(200).json({
      message: "My invoice wire transfers fetched successfully",
      success: true,
      data: results,
    });
  });

  handleGetFile = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id, fileId } = req.params;
    const file = await this.service.getFile(id, fileId);
    return res.status(200).json({
      message: "File fetched successfully",
      success: true,
      data: file,
    });
  });

  handleViewFile = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id, fileId } = req.params;
    await this.service.viewFile(id, fileId, res);
  });
}
