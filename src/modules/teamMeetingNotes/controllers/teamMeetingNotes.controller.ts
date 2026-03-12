import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { TeamMeetingNotesService } from "../services/teamMeetingNotes.service";
import { AppError } from "../../../config/utils/AppError";

const service = new TeamMeetingNotesService();

export class TeamMeetingNotesController {
  async create(req: AuthenticateRequest, res: Response) {
    const data = req.body;
    const files = mapUploadedFiles((req.files as Express.Multer.File[]) || [], "team-meeting-notes");
    const createdById = req.user?.id;
    if (!createdById) throw new AppError("User not authenticated", 401);

    const note = await service.create({ ...data, files, createdById });
    return res.status(201).json(note);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const files = mapUploadedFiles((req.files as Express.Multer.File[]) || [], "team-meeting-notes");

    const note = await service.update(id, { ...data, files });
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
