import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { DesignDrawingsService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const designService = new DesignDrawingsService();
const DESIGN_DRAWING_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "DEPUTY_MANAGER",
  "ESTIMATION_HEAD",
  "CONNECTION_DESIGNER_ENGINEER",
  "CONNECTION_DESIGNER_ADMIN",
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
    const creatorId = userId;
    // Background non-blocking tasks
    (async () => {
      try {
        await notifyProjectStakeholdersByRole(drawing.projectId, DESIGN_DRAWING_NOTIFY_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "DESIGN_DRAWING_UPLOADED",
            basePayload: { designDrawingId: drawing.id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Design Drawing Received", message: "A design drawing was received for your action." },
              oversight: { title: "Design Drawing Uploaded", message: "A design drawing was uploaded and is available for monitoring." },
              internal: { title: "New Design Drawing Uploaded", message: "A new design drawing was uploaded in the project." },
              default: { title: "Design Drawing Uploaded", message: "A design drawing was uploaded." },
            },
          }),
          { excludeUserIds: [creatorId] }
        );
      } catch (error) {
        console.error("Error in handleCreateDesignDrawing background tasks:", error);
      }
    })();

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
  async handleUpdateStage(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const updated = await designService.updateStage(id, req.body);
    const updaterId = req.user?.id;
    // Background non-blocking tasks
    (async () => {
      try {
        await notifyProjectStakeholdersByRole(updated.projectId, DESIGN_DRAWING_NOTIFY_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "DESIGN_DRAWING_UPDATED",
            basePayload: { designDrawingId: updated.id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Design Drawing Updated", message: "An updated design drawing was shared with you." },
              oversight: { title: "Design Drawing Updated", message: "A design drawing was updated." },
              internal: { title: "Design Drawing Updated", message: "A design drawing was updated in the project." },
              default: { title: "Design Drawing Updated", message: "A design drawing was updated." },
            },
          }),
          { excludeUserIds: updaterId ? [updaterId] : [] }
        );
      } catch (error) {
        console.error("Error in handleUpdateStage design drawing background tasks:", error);
      }
    })();
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
    const design = await prisma.designDrawings.findUnique({ where: { id: req.body?.designDrawingsId } });
    if (design) {
      const respUserId = userId;
      const drawingId = req.body?.designDrawingsId;
      // Background non-blocking tasks
      (async () => {
        try {
          await notifyProjectStakeholdersByRole(design.projectId, DESIGN_DRAWING_NOTIFY_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type: "DESIGN_DRAWING_RESPONSE_RECEIVED",
              basePayload: { designDrawingId: drawingId, designDrawingResponseId: response.id, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "Design Drawing Response Received", message: "A design drawing response was received for your action." },
                oversight: { title: "Design Drawing Response Received", message: "A design drawing response was submitted and is available for review." },
                internal: { title: "Design Drawing Response Received", message: "A design drawing response was submitted in the project." },
                default: { title: "Design Drawing Response Received", message: "A design drawing response was submitted." },
              },
            }),
            { excludeUserIds: [respUserId] }
          );
        } catch (error) {
          console.error("Error in handleCreateResponse design drawings background tasks:", error);
        }
      })();
    }

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
