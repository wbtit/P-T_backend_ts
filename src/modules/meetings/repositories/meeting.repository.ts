import prisma from "../../../config/database/client";
import { CreateMeetingInput,
    UpdateMeetingInput,
    MeetingAttendeeInput,
    UpdateMeetingAttendeeInput
 } from "../dtos";

 export class MeetingRepository {
    async createMeeting(data:CreateMeetingInput,userId:string){
        return await prisma.meeting.create({
      data: {
        title: data.title,
        agenda: data.agenda,
        description: data.description,
        link:data.link,
        startTime:data.startTime,
        endTime:data.endTime,
        createdById:userId,
        participants: {
          create: data.participantsSchema.map(p => ({
            userId: p.userId ?? null,
            email: p.email,
            rsvp: p.rsvp ?? "PENDING",
            role: "ATTENDEE"
          }))
        }
      },
      include: { participants: true }
    });
    }
    async get(id:string){
        return await prisma.meeting.findUnique({
      where: { id: id },
      include: {
        createdBy: true,
        participants: true
      }
    });
    }
    async Update(id:string,data:UpdateMeetingInput){
        return await prisma.meeting.update({
          where: { id:id },
          data: {
            title: data.title,
            agenda:data.agenda,
            description:data.description,
            link:data.link,
            startTime:data.startTime,
            endTime:data.endTime,
            status:data.status
          },
          include:{
            participants:true
          }
        });
    }
    async getMeetingOfUser(userid:string){
        return await prisma.meeting.findMany({
  where: {
    OR: [
      { createdById:userid },
      { participants: { some: { userId:userid } } }
    ]
  },
  include: { participants: true }
});
    }

    async delete(id:string){
        return await prisma.meeting.update({
          where: { id: id },
          data: { status: "CANCELLED" },
          include:{
            participants:true
          }
        });
    }
    async updateStatus(data:UpdateMeetingInput,meetingId:string){
        return await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: data.status },
      include:{
        participants: true
      }
    });
    }
    async getUpcomingMeeting(userId:string){
        return await prisma.meeting.findMany({
  where: {
    startTime: { gte: new Date() },
    OR: [
      { createdById: userId },
      { participants: { some: { userId: userId } } }
    ]
  },
  orderBy: { startTime: "asc" }
});
    }
    async getPastMeetings(userId:string){
        return await prisma.meeting.findMany({
  where: {
    endTime: { lt: new Date() },
    OR: [
      { createdById: userId },
      { participants: { some: { userId: userId } } }
    ]
  },
  orderBy: { endTime: "desc" }
});
    }
    async summary(meetingId:string){
        return await prisma.meeting.findUnique({
  where: { id: meetingId },
  include: {
    participants: true
  }
});
    }
    
 }