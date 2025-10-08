import prisma from "../../../config/database/client";
import { CreateMeetingInput,
    UpdateMeetingInput,
    MeetingAttendeeInput,
    UpdateMeetingAttendeeInput
 } from "../dtos";

 export class MeetingAttendeeRepository {
    async rsvp(meetingId:string,userId:string,data:UpdateMeetingAttendeeInput){
        return await prisma.meetingAttendee.updateMany({
  where: {
    meetingId: meetingId,
    userId: userId
  },
  data: { rsvp: data.rsvp } // ACCEPTED / DECLINED / MAYBE
});
    }

    async attendance(data:MeetingAttendeeInput,userId:string){
        return await prisma.meetingAttendee.update({
            where: {
              meetingId_userId: {
                meetingId: data.meetingId,
                userId
              }
            },
            data: {
              joined: true
            }
        });
    }

 async getAttendance(data:MeetingAttendeeInput){
    return await prisma.meetingAttendee.findMany({
  where: { meetingId: data.meetingId },
  include: { user: true }
});
 }

 async addParticipant(data:MeetingAttendeeInput){
    return await prisma.meetingAttendee.create({
      data: {
        meetingId:data.meetingId,
        userId: data.userId ?? null,
        email: data.email,
        rsvp: "PENDING",
        role: "ATTENDEE"
  }
});
 }
 async updateParticipant(attendeeId:string,data:UpdateMeetingAttendeeInput){
    return await prisma.meetingAttendee.update({
  where: { id:attendeeId},
  data: {
    rsvp:data.rsvp,
    role:data.role
  }
});
 }
 async removeParticipant(attendeeId:string){
    return await prisma.meetingAttendee.delete({
            where: { id: attendeeId }
        });
 }
 async attendenceHistory(userId:string){
    return await prisma.meetingAttendee.findMany({
            where: {
                userId: userId,
                joined: true
            },
            include: { meeting: true }
        });
 }
 async meetingStatusCount(){
    return await prisma.meeting.groupBy({
  by: ["status"],
  _count: true
});
 }
}