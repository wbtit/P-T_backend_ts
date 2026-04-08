import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { TeamMeetingNotesService } from "../services/teamMeetingNotes.service";
import { AppError } from "../../../config/utils/AppError";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { notifyUsers } from "../../../utils/notifyByRole";
import { UserRole, Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const TEAM_MEETING_NOTE_ROLES: UserRole[] = [
  "ADMIN",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "PROJECT_MANAGER",
  "DEPUTY_MANAGER",
  "DEPT_MANAGER",
  "CONNECTION_DESIGNER_ENGINEER",
  "CONNECTION_DESIGNER_ADMIN",
];

const service = new TeamMeetingNotesService();

export class TeamMeetingNotesController {
  async create(req: AuthenticateRequest, res: Response) {
    const data = req.body;
    const files = mapUploadedFiles((req.files as Express.Multer.File[]) || [], "team-meeting-notes");
    const createdById = req.user?.id;
    if (!createdById) throw new AppError("User not authenticated", 401);

    const note = await service.create({ ...data, files, createdById });

    const creatorIdForBg = createdById;
    const noteIdForBg = note.id;
    const projectIdForBg = note.projectId;
    const noteTitleForBg = note.title;
    const taggedUserIds = Array.isArray((note as any)?.taggedUsers)
      ? (note as any).taggedUsers
          .map((user: { id?: string }) => user.id)
          .filter((userId: string | undefined): userId is string => Boolean(userId) && userId !== creatorIdForBg)
      : [];

    // Background non-blocking tasks
    (async () => {
      try {
        if (note && projectIdForBg) {
          await notifyProjectStakeholdersByRole(projectIdForBg, TEAM_MEETING_NOTE_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type: "PROJECT_NOTE_CREATED",
              basePayload: { noteId: noteIdForBg, projectId: projectIdForBg, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "Project Note Received", message: `Project note '${noteTitleForBg}' was shared with you.` },
                oversight: { title: "Project Note Created", message: `Project note '${noteTitleForBg}' was created and is available for monitoring.` },
                internal: { title: "Project Note Created", message: `A new project note '${noteTitleForBg}' was created.` },
                default: { title: "Project Note Created", message: `A new project note '${noteTitleForBg}' was created.` },
              },
            }),
            { excludeUserIds: [creatorIdForBg] }
          );
        }

        if (taggedUserIds.length > 0) {
          await notifyUsers(taggedUserIds, {
            type: "TEAM_MEETING_NOTE_TAGGED",
            title: "You were tagged in a team meeting note",
            message: `You were tagged in '${noteTitleForBg}'.`,
            noteId: noteIdForBg,
            projectId: projectIdForBg,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error in TeamMeetingNotes create background tasks:", error);
      }
    })();

    return res.status(201).json(note);
  }

  async update(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const files = mapUploadedFiles((req.files as Express.Multer.File[]) || [], "team-meeting-notes");

    let parsedFiles: any = Prisma.JsonNull;
    if (files) {
      if (Array.isArray(files)) {
         if (files.length > 0) parsedFiles = files;
      } else {
         parsedFiles = files;
      }
    }

    const note = await service.update(id, { ...data, files: parsedFiles });

    const updaterIdForBg = req.user?.id;
    const noteIdForBg = note.id;
    const projectIdForBg = note.projectId;
    const noteTitleForBg = note.title;
    const taggedUserIds = Array.isArray((note as any)?.taggedUsers)
      ? (note as any).taggedUsers
          .map((user: { id?: string }) => user.id)
          .filter(
            (userId: string | undefined): userId is string =>
              Boolean(userId) && userId !== updaterIdForBg
          )
      : [];

    // Background non-blocking tasks
    (async () => {
      try {
        if (note && projectIdForBg) {
          await notifyProjectStakeholdersByRole(projectIdForBg, TEAM_MEETING_NOTE_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type: "PROJECT_NOTE_UPDATED",
              basePayload: { noteId: noteIdForBg, projectId: projectIdForBg, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "Project Note Updated", message: `Updated project note '${noteTitleForBg}' was shared with you.` },
                oversight: { title: "Project Note Updated", message: `Project note '${noteTitleForBg}' was updated.` },
                internal: { title: "Project Note Updated", message: `Project note '${noteTitleForBg}' was updated.` },
                default: { title: "Project Note Updated", message: `Project note '${noteTitleForBg}' was updated.` },
              },
            }),
            { excludeUserIds: updaterIdForBg ? [updaterIdForBg] : [] }
          );
        }

        if (taggedUserIds.length > 0) {
          await notifyUsers(taggedUserIds, {
            type: "TEAM_MEETING_NOTE_TAGGED",
            title: "You were tagged in a team meeting note",
            message: `You were tagged in '${noteTitleForBg}'.`,
            noteId: noteIdForBg,
            projectId: projectIdForBg,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error in TeamMeetingNotes update background tasks:", error);
      }
    })();

    return res.status(200).json(note);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await service.delete(id);
    return res.status(204).send();
  }

  async findById(req: Request, res: Response) {
    const { id } = req.params;
    const note = await service.findById(id);
    return res.status(200).json(note);
  }

  async findByProjectId(req: Request, res: Response) {
    const { projectId } = req.params;
    const notes = await service.findByProjectId(projectId);
    return res.status(200).json(notes);
  }

  async findByMeetingId(req: Request, res: Response) {
    const { meetingId } = req.params;
    const notes = await service.findByMeetingId(meetingId);
    return res.status(200).json(notes);
  }

  async findAll(_req: Request, res: Response) {
    const notes = await service.findAll();
    return res.status(200).json(notes);
  }

  async getFile(req: Request, res: Response) {
    const { noteId, fileId } = req.params;
    const file = await service.getFile(noteId, fileId);
    return res.status(200).json(file);
  }

  async viewFile(req: Request, res: Response) {
    const { noteId, fileId } = req.params;
    await service.viewFile(noteId, fileId, res);
  }
}
