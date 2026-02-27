import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { MeetingAttendeeService } from "../services";
import { MeetingAttendeeInput, UpdateMeetingAttendeeInput } from "../dtos";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

const meetingAttendeeService = new MeetingAttendeeService();
const MEETING_NOTIFY_ROLES: UserRole[] = [
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

export class MeetingAttendeeController {
  // UPDATE RSVP
  async handleUpdateRsvp(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { meetingId } = req.params;
    const { rsvp } = req.body as UpdateMeetingAttendeeInput;

    const result = await meetingAttendeeService.updateRsvp(meetingId, req.user.id, { rsvp });
    await notifyByRoles(MEETING_NOTIFY_ROLES, {
      type: "MEETING_RSVP_RECEIVED",
      title: "RSVP Response Received",
      message: `A participant RSVP'd '${rsvp}' for a meeting.`,
      meetingId,
      rsvp,
      userId: req.user.id,
      timestamp: new Date(),
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  }

  // MARK ATTENDANCE
  async handleMarkAttendance(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const attendanceData: MeetingAttendeeInput = req.body;

    const result = await meetingAttendeeService.markAttendance(attendanceData, req.user.id);

    res.status(200).json({
      status: "success",
      data: result,
    });
  }

  // GET ATTENDANCE LIST
  async handleGetAttendance(req: Request, res: Response) {
    const { meetingId } = req.params;

    const attendees = await meetingAttendeeService.getAttendance(meetingId);

    res.status(200).json({
      status: "success",
      data: attendees,
    });
  }

  // ADD PARTICIPANT
  async handleAddParticipant(req: Request, res: Response) {
    const participantData: MeetingAttendeeInput = req.body;

    const participant = await meetingAttendeeService.addParticipant(participantData);

    res.status(201).json({
      status: "success",
      data: participant,
    });
  }

  // UPDATE PARTICIPANT
  async handleUpdateParticipant(req: Request, res: Response) {
    const { attendeeId } = req.params;
    const updateData: UpdateMeetingAttendeeInput = req.body;

    const updatedParticipant = await meetingAttendeeService.updateParticipant(attendeeId, updateData);

    res.status(200).json({
      status: "success",
      data: updatedParticipant,
    });
  }

  // REMOVE PARTICIPANT
  async handleRemoveParticipant(req: Request, res: Response) {
    const { attendeeId } = req.params;

    const result = await meetingAttendeeService.removeParticipant(attendeeId);

    res.status(200).json({
      status: "success",
      data: result,
    });
  }

  // GET ATTENDANCE HISTORY FOR USER
  async handleGetAttendanceHistory(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const history = await meetingAttendeeService.getAttendanceHistory(req.user.id);

    res.status(200).json({
      status: "success",
      data: history,
    });
  }

  // GET MEETING STATUS COUNT
  async handleGetMeetingStatusCount(req: Request, res: Response) {
    const statusCount = await meetingAttendeeService.getMeetingStatusCount();

    res.status(200).json({
      status: "success",
      data: statusCount,
    });
  }
}
