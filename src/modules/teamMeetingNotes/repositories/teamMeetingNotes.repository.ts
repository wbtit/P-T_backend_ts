import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { CreateTeamMeetingNoteInput, UpdateTeamMeetingNoteInput } from "../dtos";

export class TeamMeetingNotesRepository {
  async create(data: CreateTeamMeetingNoteInput) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: data.projectId },
        select: { projectCode: true, projectNumber: true },
      });
      if (!project) {
        throw new AppError("Project not found for team meeting notes serial generation", 404);
      }

      const serialNo = await generateProjectScopedSerial(tx, {
        prefix: SERIAL_PREFIX.TEAM_MEETING_NOTES,
        projectScopeId: data.projectId,
        projectToken: project.projectCode ?? project.projectNumber,
      });

      return tx.teamMeetingNotes.create({
        data: {
          ...data,
          serialNo,
        },
      });
    });
  }

  async update(id: string, data: UpdateTeamMeetingNoteInput) {
    return prisma.teamMeetingNotes.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.teamMeetingNotes.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    return prisma.teamMeetingNotes.findUnique({
      where: { id },
      include:{
        createdBy:{
          select:{
            id:true,
            firstName:true,
            middleName:true,
            lastName:true
          }
      }
    }
    });
  }

  async findByProjectId(projectId: string) {
    return prisma.teamMeetingNotes.findMany({
      where: { projectId },
      include:{
        createdBy:{
          select:{
            id:true,
            firstName:true,
            middleName:true,
            lastName:true
          }
      }
    },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByMeetingId(meetingId: string) {
    return prisma.teamMeetingNotes.findMany({
      where: { meetingId },
      include:{
        createdBy:{
          select:{
            id:true,
            firstName:true,
            middleName:true,
            lastName:true
          }
      }
    },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return prisma.teamMeetingNotes.findMany({
      orderBy: { createdAt: "desc" },
      include:{
        createdBy:{
          select:{
            id:true,
            firstName:true,
            middleName:true,
            lastName:true
          }
      }
    }
    });
  }
}
