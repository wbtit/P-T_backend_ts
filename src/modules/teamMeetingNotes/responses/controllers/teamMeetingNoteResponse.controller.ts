import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { AppError } from "../../../../config/utils/AppError";
import { mapUploadedFiles } from "../../../uploads/fileUtil";
import { TeamMeetingNoteResponseService } from "../services/teamMeetingNoteResponse.service";
import { notifyProjectStakeholdersByRole } from "../../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";
import prisma from "../../../../config/database/client";
import { buildRoleScopedNotification } from "../../../../utils/stakeholderNotificationMessages";

const service = new TeamMeetingNoteResponseService();
const NOTE_RESPONSE_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "CONNECTION_DESIGNER_ADMIN",
  "STAFF",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class TeamMeetingNoteResponseController {
  async handleCreate(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;
    const { noteId } = req.params;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "team-meeting-notes-responses"
    );

    const response = await service.create(noteId, userId, {
      ...req.body,
      files: uploadedFiles,
    });

    const creatorIdForBg = userId;
    const parentRespIdForBg = req.body?.parentResponseId;
    const noteIdForBg = noteId;

    // Background non-blocking tasks
    (async () => {
      try {
        const note = await prisma.teamMeetingNotes.findUnique({
          where: { id: noteIdForBg },
          select: { projectId: true },
        });

        if (note && note.projectId) {
          const type = parentRespIdForBg ? "PROJECT_NOTE_REPLY" : "PROJECT_NOTE_RESPONSE";
          await notifyProjectStakeholdersByRole(note.projectId, NOTE_RESPONSE_NOTIFY_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type,
              basePayload: { noteId: noteIdForBg, noteResponseId: response.id, projectId: note.projectId, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: parentRespIdForBg ? "Project Note Reply Received" : "Project Note Response Received", message: "A new project note response was received for your action." },
                oversight: { title: parentRespIdForBg ? "Project Note Reply" : "Project Note Response", message: "A new project note response was submitted and is available for review." },
                internal: { title: parentRespIdForBg ? "Project Note Reply" : "Project Note Response", message: "A new project note response was submitted in the project." },
                default: { title: parentRespIdForBg ? "Project Note Reply" : "Project Note Response", message: "A new project note response was submitted." },
              },
            }),
            { excludeUserIds: [creatorIdForBg] }
          );
        }
      } catch (error) {
        console.error("Error in TeamMeetingNoteResponse create background tasks:", error);
      }
    })();

    return res.status(201).json({
      message: "Team meeting note response created",
      status: "success",
      data: response,
    });
  }

  async handleGetById(req: Request, res: Response) {
    const { id } = req.params;
    const response = await service.getById(id);
    return res.status(200).json({ status: "success", data: response });
  }

  async handleGetByNote(req: Request, res: Response) {
    const { noteId } = req.params;
    const responses = await service.findByNoteId(noteId);
    return res.status(200).json({ status: "success", data: responses });
  }

  async handleUpdate(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const files = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "team-meeting-notes-responses"
    );
    const response = await service.update(id, { ...data, files });
    return res.status(200).json({ status: "success", data: response });
  }

  async handleDelete(req: Request, res: Response) {
    const { id } = req.params;
    await service.delete(id);
    return res.status(204).send();
  }

  async handleGetFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    const file = await service.getFile(responseId, fileId);
    return res.status(200).json({ status: "success", data: file });
  }

  async handleViewFile(req: Request, res: Response) {
    const { responseId, fileId } = req.params;
    await service.viewFile(responseId, fileId, res);
  }
}
