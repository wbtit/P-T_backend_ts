import { Request, Response } from "express";
import { CoordinationDrawingService } from "../services";
import { CreateCoordinationDrawingSchema,
  UpdateCoordinationDrawingSchema,
  CreateCoordinationDrawingResponseSchema,
  UpdateCoordinationDrawingResponseSchema
} from "../dtos";
import { asyncHandler } from "../../../config/utils/asyncHandler";
import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { mapUploadedFiles } from "../../uploads/fileUtil";

const ALLOWED_ROLES = [
  "ADMIN",
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "TEAM_LEAD",
  "CLIENT_ADMIN",
  "CLIENT_ESTIMATOR",
  "CLIENT",
];

export class CoordinationDrawingController {
  private service = new CoordinationDrawingService();

  create = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "coordinationdrawing"
    );
    const payload = CreateCoordinationDrawingSchema.parse({
      ...req.body,
      files: uploadedFiles,
    });
    const report = await this.service.create(payload, userId);
    return res.status(201).json({
      message: "Coordination drawing created successfully",
      success: true,
      data: report,
    });
  });

  update = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "coordinationdrawing"
    );
    const payload = UpdateCoordinationDrawingSchema.parse({
      ...req.body,
      ...(uploadedFiles.length > 0 ? { files: uploadedFiles } : {}),
    });
    const report = await this.service.update(payload, id);
    return res.status(200).json({
      message: "Coordination drawing updated successfully",
      success: true,
      data: report,
    });
  });

  get = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const report = await this.service.get({ id });
    return res.status(200).json({
      message: "Coordination drawing fetched successfully",
      success: true,
      data: report,
    });
  });

  delete = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const report = await this.service.delete(id);
    return res.status(200).json({
      message: "Coordination drawing deleted successfully",
      success: true,
      data: report,
    });
  });

  getByProjectId = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { projectId } = req.params;
    const reports = await this.service.getByProjectId(projectId);
    return res.status(200).json({
      message: "Coordination drawings fetched successfully",
      success: true,
      data: reports,
    });
  });

  getAll = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const reports = await this.service.getAll();
    return res.status(200).json({
      message: "All coordination drawings fetched successfully",
      success: true,
      data: reports,
    });
  });

  createResponse = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "coordinationdrawingresponse"
    );
    const payload = CreateCoordinationDrawingResponseSchema.parse({
      ...req.body,
      files: uploadedFiles,
    });
    const response = await this.service.createResponse(payload, userId);
    return res.status(201).json({
      message: "Response created successfully",
      success: true,
      data: response,
    });
  });

  updateResponse = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "coordinationdrawingresponse"
    );
    const payload = UpdateCoordinationDrawingResponseSchema.parse({
      ...req.body,
      ...(uploadedFiles.length > 0 ? { files: uploadedFiles } : {}),
    });
    const response = await this.service.updateResponse(payload, id, userId);
    return res.status(200).json({
      message: "Response updated successfully",
      success: true,
      data: response,
    });
  });

  getResponse = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const response = await this.service.getResponse({ id });
    return res.status(200).json({
      message: "Response fetched successfully",
      success: true,
      data: response,
    });
  });

  deleteResponse = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const response = await this.service.deleteResponse(id, userId);
    return res.status(200).json({
      message: "Response deleted successfully",
      success: true,
      data: response,
    });
  });

  getResponsesByDrawingId = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { drawingId } = req.params;
    const responses = await this.service.getResponsesByDrawingId(drawingId);
    return res.status(200).json({
      message: "Responses fetched successfully",
      success: true,
      data: responses,
    });
  });

  getFile = asyncHandler(async (req: Request, res: Response) => {
    const { drawingId, fileId } = req.params;
    const file = await this.service.getFile(drawingId, fileId);
    return res.status(200).json({
      message: "Coordination drawing file fetched successfully",
      success: true,
      data: file,
    });
  });

  viewFile = asyncHandler(async (req: Request, res: Response) => {
    const { drawingId, fileId } = req.params;
    await this.service.viewFile(drawingId, fileId, res);
  });

  getResponseFile = asyncHandler(async (req: Request, res: Response) => {
    const { responseId, fileId } = req.params;
    const file = await this.service.getResponseFile(responseId, fileId);
    return res.status(200).json({
      message: "Coordination drawing response file fetched successfully",
      success: true,
      data: file,
    });
  });

  viewResponseFile = asyncHandler(async (req: Request, res: Response) => {
    const { responseId, fileId } = req.params;
    await this.service.viewResponseFile(responseId, fileId, res);
  });
}
