import prisma from "../../../../config/database/client";
import { CreateTeamMeetingNoteResponseInput, UpdateTeamMeetingNoteResponseInput } from "../dtos";

export class TeamMeetingNoteResponseRepository {
  async create(noteId: string, userId: string, data: CreateTeamMeetingNoteResponseInput) {
    return prisma.teamMeetingNoteResponse.create({
      data: {
        noteId,
        createdById: userId,
        content: data.content,
        files: data.files,
        parentResponseId: data.parentResponseId ?? null,
      },
    });
  }

  async update(id: string, data: UpdateTeamMeetingNoteResponseInput) {
    return prisma.teamMeetingNoteResponse.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.teamMeetingNoteResponse.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    return prisma.teamMeetingNoteResponse.findUnique({
      where: { id },
      include: {
        childResponses: true,
        createdBy: { select: { firstName: true, middleName: true, lastName: true } },
      },
    });
  }

  async findByNoteId(noteId: string) {
    return prisma.teamMeetingNoteResponse.findMany({
      where: { noteId },
      include: {
        childResponses: true,
        createdBy: { select: { firstName: true, middleName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findParentOrThrow(id: string) {
    const response = await prisma.teamMeetingNoteResponse.findUnique({
      where: { id },
      select: { id: true, noteId: true },
    });
    return response;
  }
}
