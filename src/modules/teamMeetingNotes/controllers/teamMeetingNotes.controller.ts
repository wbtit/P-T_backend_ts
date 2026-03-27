import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { TeamMeetingNotesService } from "../services/teamMeetingNotes.service";
import { AppError } from "../../../config/utils/AppError";
import { notifyProjectStakeholders } from "../../../utils/notifyProjectStakeholders";
import { notifyUsers } from "../../../utils/notifyByRole";
import { UserRole, Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";

const TEAM_MEETING_NOTE_ROLES: UserRole[] = [
  "ADMIN",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "PROJECT_MANAGER",
  "DEPUTY_MANAGER",
  "DEPT_MANAGER",
];

const service = new TeamMeetingNotesService();

export class TeamMeetingNotesController {
  async create(req: AuthenticateRequest, res: Response) {
    const data = req.body;
    const files = mapUploadedFiles((req.files as Express.Multer.File[]) || [], "team-meeting-notes");
    const createdById = req.user?.id;
    if (!createdById) throw new AppError("User not authenticated", 401);

    const note = await service.create({ ...data, files, createdById });

    if (note && note.projectId) {
      await notifyProjectStakeholders(note.projectId, TEAM_MEETING_NOTE_ROLES, {
        type: "PROJECT_NOTE_CREATED",
        title: "Project Note Created",
        message: `A new project note '${note.title}' was created.`,
        noteId: note.id,
        projectId: note.projectId,
        timestamp: new Date(),
      });
    }

    const taggedUserIds = Array.isArray((note as any)?.taggedUsers)
      ? (note as any).taggedUsers
          .map((user: { id?: string }) => user.id)
          .filter((userId: string | undefined): userId is string => Boolean(userId) && userId !== createdById)
      : [];

    await notifyUsers(taggedUserIds, {
      type: "TEAM_MEETING_NOTE_TAGGED",
      title: "You were tagged in a team meeting note",
      message: `You were tagged in '${note.title}'.`,
      noteId: note.id,
      projectId: note.projectId,
      timestamp: new Date(),
    });

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

    if (note && note.projectId) {
      await notifyProjectStakeholders(note.projectId, TEAM_MEETING_NOTE_ROLES, {
        type: "PROJECT_NOTE_UPDATED",
        title: "Project Note Updated",
        message: `Project note '${note.title}' was updated.`,
        noteId: note.id,
        projectId: note.projectId,
        timestamp: new Date(),
      });
    }

    const taggedUserIds = Array.isArray((note as any)?.taggedUsers)
      ? (note as any).taggedUsers
          .map((user: { id?: string }) => user.id)
          .filter(
            (userId: string | undefined): userId is string =>
              Boolean(userId) && userId !== req.user?.id
          )
      : [];

    await notifyUsers(taggedUserIds, {
      type: "TEAM_MEETING_NOTE_TAGGED",
      title: "You were tagged in a team meeting note",
      message: `You were tagged in '${note.title}'.`,
      noteId: note.id,
      projectId: note.projectId,
      timestamp: new Date(),
    });

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
