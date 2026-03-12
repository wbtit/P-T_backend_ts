import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { MeetingService } from "../services";
import { sendEmail } from "../../../services/mailServices/mailconfig";
import { notifyUsers, notifyByRoles } from "../../../utils/notifyByRole";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";

const meetingService = new MeetingService();
const MEETING_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class MeetingController {
  // CREATE MEETING
  async handleCreateMeeting(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: userId } = req.user;

    const meeting = await meetingService.create({
      ...req.body,
    }, userId);

    await sendEmail({
      to: meeting.participants.map(p => p.email).join(","), // <-- safer
      subject: `📅 Meeting Scheduled: ${meeting.title}`,
      text: `You have been invited to the meeting "${meeting.title}".\n\nAgenda: ${meeting.agenda}\n\n🕒 Start: ${meeting.startTime}\n🔗 Link: ${meeting.link}`,
      html: `
        <h2>📅 New Meeting Scheduled</h2>
        <p><strong>Title:</strong> ${meeting.title}</p>
        <p><strong>Agenda:</strong> ${meeting.agenda}</p>
        <p><strong>Description:</strong> ${meeting.description ?? "N/A"}</p>
        <p><strong>Start:</strong> ${
  meeting.startTime
    ? new Date(meeting.startTime).toLocaleString()
    : "Not specified"
}</p>
<p><strong>End:</strong> ${
  meeting.endTime
    ? new Date(meeting.endTime).toLocaleString()
    : "Not specified"
}</p>

        <p><a href="${meeting.link}">🔗 Join Meeting</a></p>
      `
    });
    const participantIds = (meeting as any).participants?.map((p: any) => p.userId).filter(Boolean) || [];
    const recipientIds = Array.from(new Set([...participantIds, meeting.createdById]));
    await notifyUsers(recipientIds, {
      type: "MEETING_SCHEDULED",
      title: "Meeting Scheduled",
      message: `Meeting '${meeting.title}' has been scheduled.`,
      meetingId: meeting.id,
      startTime: meeting.startTime,
      timestamp: new Date(),
    });

    res.status(201).json({
      message: "Meeting created",
      status: "success",
      data: meeting,
    });
  }

  // GET MEETING BY ID
  async handleGetMeetingById(req: Request, res: Response) {
    const { id } = req.params;

    const meeting = await meetingService.getById(id);

    res.status(200).json({
      status: "success",
      data: meeting,
    });
  }

  // UPDATE MEETING
  async handleUpdateMeeting(req: Request, res: Response) {
    const { id } = req.params;

    const updatedMeeting = await meetingService.update(id, {
      ...req.body,
    });
    const attendees = await prisma.meetingAttendee.findMany({ where: { meetingId: updatedMeeting.id, userId: { not: null } } });
    const recipientIds = Array.from(new Set([updatedMeeting.createdById, ...attendees.map(a => a.userId as string)]));
    await notifyUsers(recipientIds, {
      type: "MEETING_RESCHEDULED",
      title: "Meeting Rescheduled",
      message: `Meeting '${updatedMeeting.title}' has been updated.`,
      meetingId: updatedMeeting.id,
      startTime: updatedMeeting.startTime,
      endTime: updatedMeeting.endTime,
      timestamp: new Date(),
    });

    res.status(200).json({
      status: "success",
      data: updatedMeeting,
    });
  }

  // DELETE (SOFT CANCEL) MEETING
  async handleDeleteMeeting(req: Request, res: Response) {
    const { id } = req.params;

    const deletedMeeting = await meetingService.delete(id);
    const attendees = await prisma.meetingAttendee.findMany({ where: { meetingId: deletedMeeting.id, userId: { not: null } } });
    const recipientIds = Array.from(new Set([deletedMeeting.createdById, ...attendees.map(a => a.userId as string)]));
    await notifyUsers(recipientIds, {
      type: "MEETING_CANCELLED",
      title: "Meeting Cancelled",
      message: `Meeting '${deletedMeeting.title}' has been cancelled.`,
      meetingId: deletedMeeting.id,
      timestamp: new Date(),
    });

    res.status(200).json({
      status: "success",
      data: deletedMeeting,
    });
  }

  // UPDATE MEETING STATUS
  async handleUpdateMeetingStatus(req: Request, res: Response) {
    const { id } = req.params;

    const updatedStatusMeeting = await meetingService.updateStatus(id, {
      ...req.body,
    });
    const attendees = await prisma.meetingAttendee.findMany({ where: { meetingId: updatedStatusMeeting.id, userId: { not: null } } });
    const recipientIds = Array.from(new Set([updatedStatusMeeting.createdById, ...attendees.map(a => a.userId as string)]));
    await notifyUsers(recipientIds, {
      type: "MEETING_STATUS_UPDATED",
      title: "Meeting Status Updated",
      message: `Meeting '${updatedStatusMeeting.title}' status changed to '${updatedStatusMeeting.status}'.`,
      meetingId: updatedStatusMeeting.id,
      status: updatedStatusMeeting.status,
      timestamp: new Date(),
    });

    res.status(200).json({
      status: "success",
      data: updatedStatusMeeting,
    });
  }

  // GET MEETINGS FOR USER
  async handleGetMeetingsOfUser(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: userId } = req.user;

    const meetings = await meetingService.getMeetingsOfUser(userId);

    res.status(200).json({
      status: "success",
      data: meetings,
    });
  }

  // GET UPCOMING MEETINGS FOR USER
  async handleGetUpcomingMeetings(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: userId } = req.user;

    const meetings = await meetingService.getUpcomingMeetings(userId);

    res.status(200).json({
      status: "success",
      data: meetings,
    });
  }

  // GET PAST MEETINGS FOR USER
  async handleGetPastMeetings(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: userId } = req.user;

    const meetings = await meetingService.getPastMeetings(userId);

    res.status(200).json({
      status: "success",
      data: meetings,
    });
  }

  // GET MEETING SUMMARY
  async handleGetMeetingSummary(req: Request, res: Response) {
    const { id } = req.params;

    const summary = await meetingService.getSummary(id);

    res.status(200).json({
      status: "success",
      data: summary,
    });
  }

  // GET SPECIFIC FILE FROM MEETING
  async handleGetFile(req: Request, res: Response) {
    const { meetingId, fileId } = req.params;

    const file = await meetingService.getFile(meetingId, fileId);

    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // STREAM FILE FROM MEETING
  async handleViewFile(req: Request, res: Response) {
    const { meetingId, fileId } = req.params;

    await meetingService.viewFile(meetingId, fileId, res);
  }
}
