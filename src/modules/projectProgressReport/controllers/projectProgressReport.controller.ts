import { Request, Response } from "express";
import { ProjectProgressReportService } from "../services";
import { CreateProjectProgressReportSchema,
  UpdateProjectProgressReportSchema,
  CreateProjectProgressReportResponseSchema,
  UpdateProjectProgressReportResponseSchema
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

export class ProjectProgressReportController {
  private service = new ProjectProgressReportService();

  create = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "projectprogressreport"
    );
    const payload = CreateProjectProgressReportSchema.parse({
      ...req.body,
      files: uploadedFiles,
    });
    const report = await this.service.create(payload, userId);
    return res.status(201).json({
      message: "Progress report created successfully",
      success: true,
      data: report,
    });
  });

  update = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "projectprogressreport"
    );
    const payload = UpdateProjectProgressReportSchema.parse({
      ...req.body,
      ...(uploadedFiles.length > 0 ? { files: uploadedFiles } : {}),
    });
    const report = await this.service.update(payload, id);
    return res.status(200).json({
      message: "Progress report updated successfully",
      success: true,
      data: report,
    });
  });

  get = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const report = await this.service.get({ id });
    return res.status(200).json({
      message: "Progress report fetched successfully",
      success: true,
      data: report,
    });
  });

  delete = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { id } = req.params;
    const report = await this.service.delete(id);
    return res.status(200).json({
      message: "Progress report deleted successfully",
      success: true,
      data: report,
    });
  });

  getByProjectId = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { projectId } = req.params;
    const reports = await this.service.getByProjectId(projectId);
    return res.status(200).json({
      message: "Progress reports fetched successfully",
      success: true,
      data: reports,
    });
  });

  getAll = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const reports = await this.service.getAll();
    return res.status(200).json({
      message: "All progress reports fetched successfully",
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
      "projectprogressreportresponse"
    );
    const payload = CreateProjectProgressReportResponseSchema.parse({
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
      "projectprogressreportresponse"
    );
    const payload = UpdateProjectProgressReportResponseSchema.parse({
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

  getResponsesByReportId = asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { reportId } = req.params;
    const responses = await this.service.getResponsesByReportId(reportId);
    return res.status(200).json({
      message: "Responses fetched successfully",
      success: true,
      data: responses,
    });
  });

  getFile = asyncHandler(async (req: Request, res: Response) => {
    const { reportId, fileId } = req.params;
    const file = await this.service.getFile(reportId, fileId);
    return res.status(200).json({
      message: "Progress report file fetched successfully",
      success: true,
      data: file,
    });
  });

  viewFile = asyncHandler(async (req: Request, res: Response) => {
    const { reportId, fileId } = req.params;
    await this.service.viewFile(reportId, fileId, res);
  });

  getResponseFile = asyncHandler(async (req: Request, res: Response) => {
    const { responseId, fileId } = req.params;
    const file = await this.service.getResponseFile(responseId, fileId);
    return res.status(200).json({
      message: "Progress report response file fetched successfully",
      success: true,
      data: file,
    });
  });

  viewResponseFile = asyncHandler(async (req: Request, res: Response) => {
    const { responseId, fileId } = req.params;
    await this.service.viewResponseFile(responseId, fileId, res);
  });
}
