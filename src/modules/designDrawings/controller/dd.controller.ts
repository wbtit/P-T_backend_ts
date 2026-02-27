import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { DesignDrawingsService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

const designService = new DesignDrawingsService();
const DESIGN_DRAWING_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "DEPUTY_MANAGER",
  "ESTIMATION_HEAD",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class DesignDrawingsController {
  // ✅ CREATE DESIGN DRAWING
  async handleCreateDesignDrawing(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;

    // Map uploaded files (if any)
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "designdrawings"
    );

    const data = {
      ...req.body,
      files: uploadedFiles,
    };

    const drawing = await designService.create(data, userId);
    await notifyByRoles(DESIGN_DRAWING_NOTIFY_ROLES, {
      type: "DESIGN_DRAWING_UPLOADED",
      title: "Design Drawing Uploaded",
      message: "A design drawing was uploaded.",
      designDrawingId: drawing.id,
      timestamp: new Date(),
    });

    res.status(201).json({
      message: "Design Drawing created successfully",
      status: "success",
      data: drawing,
    });
  }

  // ✅ GET ALL DESIGN DRAWINGS (ADMIN-LEVEL)
  async handleGetAll(req: Request, res: Response) {
    const drawings = await designService.getAll();
    res.status(200).json({
      status: "success",
      data: drawings,
    });
  }

  // ✅ GET DESIGN DRAWINGS BY PROJECT
  async handleGetByProject(req: Request, res: Response) {
    const { projectId } = req.params;
    const drawings = await designService.getByProjectId(projectId);
    res.status(200).json({
      status: "success",
      data: drawings,
    });
  }

  // ✅ GET DESIGN DRAWING BY ID
  async handleGetById(req: Request, res: Response) {
    const { id } = req.params;
    const drawing = await designService.findById(id);
    res.status(200).json({
      status: "success",
      data: drawing,
    });
  }

  // ✅ UPDATE DESIGN DRAWING (Stage / Description)
  async handleUpdateStage(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await designService.updateStage(id, req.body);
    await notifyByRoles(DESIGN_DRAWING_NOTIFY_ROLES, {
      type: "DESIGN_DRAWING_UPDATED",
      title: "Design Drawing Updated",
      message: "A design drawing was updated.",
      designDrawingId: updated.id,
      timestamp: new Date(),
    });
    res.status(200).json({
      message: "Design Drawing updated successfully",
      status: "success",
      data: updated,
    });
  }

  // ✅ DELETE DESIGN DRAWING
  async handleDelete(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await designService.delete(id);
    res.status(200).json({
      message: "Design Drawing deleted successfully",
      status: "success",
      data: deleted,
    });
  }

  // ✅ CREATE RESPONSE FOR DESIGN DRAWING
  async handleCreateResponse(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "designdrawingresponse"
    );

    const response = await designService.createResponse(
      { ...req.body, files: uploadedFiles },
      userId
    );
    await notifyByRoles(DESIGN_DRAWING_NOTIFY_ROLES, {
      type: "DESIGN_DRAWING_RESPONSE_RECEIVED",
      title: "Design Drawing Response Received",
      message: "A design drawing response was submitted.",
      designDrawingId: req.body?.designDrawingsId,
      designDrawingResponseId: response.id,
      timestamp: new Date(),
    });

    res.status(201).json({
      message: "Response created successfully",
      status: "success",
      data: response,
    });
  }

  // ✅ GET ALL RESPONSES FOR A DESIGN DRAWING
  async handleGetResponses(req: Request, res: Response) {
    const { designId } = req.params;
    const responses = await designService.getResponses(designId);
    res.status(200).json({
      status: "success",
      data: responses,
    });
  }

  // ✅ GET SINGLE FILE (FROM DESIGN DRAWING)
  async handleGetFile(req: Request, res: Response) {
    const { designId, fileId } = req.params;
    const file = await designService.getFile(designId, fileId);
    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // ✅ GET SINGLE FILE (FROM RESPONSE)
  async handleGetResponseFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    const file = await designService.getResponseFile(responseId, fileId);
    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // ✅ STREAM FILE (FROM DESIGN DRAWING)
  async handleViewFile(req: Request, res: Response) {
    const { designId, fileId } = req.params;
    await designService.viewFile(designId, fileId, res);
  }

  // ✅ STREAM FILE (FROM RESPONSE)
  async handleViewResponseFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    await designService.viewResponseFile(responseId, fileId, res);
  }
}
