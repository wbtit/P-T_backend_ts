import { Response } from "express";
import path from "path";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { streamFile, UPLOAD_BASE_DIR } from "../../../utils/fileUtil";
import { CreateTeamMeetingNoteInput, UpdateTeamMeetingNoteInput } from "../dtos";
import { TeamMeetingNotesRepository } from "../repositories/teamMeetingNotes.repository";

const repo = new TeamMeetingNotesRepository();

export class TeamMeetingNotesService {
  async create(data: CreateTeamMeetingNoteInput) {
    return repo.create(data);
  }

  async update(id: string, data: UpdateTeamMeetingNoteInput) {
    return repo.update(id, data);
  }

  async delete(id: string) {
    return repo.delete(id);
  }

  async findById(id: string) {
    return repo.findById(id);
  }

  async findByProjectId(projectId: string) {
    return repo.findByProjectId(projectId);
  }

  async findByMeetingId(meetingId: string) {
    return repo.findByMeetingId(meetingId);
  }

  async findAll() {
    return repo.findAll();
  }

  async getFile(noteId: string, fileId: string) {
    const note = await repo.findById(noteId);
    if (!note) throw new AppError("Team meeting note not found", 404);

    const files = note.files as unknown as FileObject[];
    const file = files.find((f) => f.id === fileId);
    if (!file) throw new AppError("File not found", 404);

    return file;
  }

  async viewFile(noteId: string, fileId: string, res: Response) {
    const note = await repo.findById(noteId);
    if (!note) throw new AppError("Team meeting note not found", 404);

    const files = note.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file) => file.id === cleanFileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const filePath = path.join(UPLOAD_BASE_DIR, fileObject.path);
    return streamFile(res, filePath, fileObject.originalName);
  }
}
