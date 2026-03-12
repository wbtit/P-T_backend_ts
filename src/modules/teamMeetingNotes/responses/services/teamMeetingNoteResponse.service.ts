import { Response } from "express";
import path from "path";
import fs from "fs";
import { AppError } from "../../../../config/utils/AppError";
import prisma from "../../../../config/database/client";
import { FileObject } from "../../../../shared/fileType";
import { streamFile } from "../../../../utils/fileUtil";
import { CreateTeamMeetingNoteResponseInput, UpdateTeamMeetingNoteResponseInput } from "../dtos";
import { TeamMeetingNoteResponseRepository } from "../repositories/teamMeetingNoteResponse.repository";

const repo = new TeamMeetingNoteResponseRepository();

export class TeamMeetingNoteResponseService {
  async create(noteId: string, userId: string, data: CreateTeamMeetingNoteResponseInput) {
    const note = await prisma.teamMeetingNotes.findUnique({
      where: { id: noteId },
      select: { id: true, projectId: true, visibility: true },
    });
    if (!note) throw new AppError("Team meeting note not found", 404);

    if (data.parentResponseId) {
      const parent = await repo.findById(data.parentResponseId);
      if (!parent || parent.noteId !== noteId) {
        throw new AppError("Parent response does not belong to this note", 400);
      }
    }

    return repo.create(noteId, userId, data);
  }

  async update(id: string, data: UpdateTeamMeetingNoteResponseInput) {
    if (data.parentResponseId) {
      const parent = await repo.findParentOrThrow(data.parentResponseId);
      if (!parent) throw new AppError("Parent response not found", 404);
    }
    return repo.update(id, data);
  }

  async delete(id: string) {
    return repo.delete(id);
  }

  async getById(id: string) {
    return repo.findById(id);
  }

  async findByNoteId(noteId: string) {
    return repo.findByNoteId(noteId);
  }

  async getFile(responseId: string, fileId: string) {
    const response = await repo.findById(responseId);
    if (!response) throw new AppError("Team meeting note response not found", 404);

    const files = response.files as unknown as FileObject[];
    const file = files.find((f) => f.id === fileId);
    if (!file) throw new AppError("File not found", 404);

    return file;
  }

  async viewFile(responseId: string, fileId: string, res: Response) {
    const response = await repo.findById(responseId);
    if (!response) throw new AppError("Team meeting note response not found", 404);

    const files = response.files as unknown as FileObject[];
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file) => file.id === cleanFileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, "public", fileObject.path);
    if (!fs.existsSync(filePath)) {
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }
}
