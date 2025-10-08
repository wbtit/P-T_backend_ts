import { MeetingAttendeeRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import { 
  MeetingAttendeeInput, 
  UpdateMeetingAttendeeInput 
} from "../dtos";

const meetingAttendeeRepo = new MeetingAttendeeRepository();

export class MeetingAttendeeService {

  /** ---------------- RSVP UPDATE ---------------- **/
  async updateRsvp(meetingId: string, userId: string, data: UpdateMeetingAttendeeInput) {
    if (!data.rsvp) throw new AppError("RSVP status is required", 400);
    const result = await meetingAttendeeRepo.rsvp(meetingId, userId, data);
    if (result.count === 0) throw new AppError("No attendee found to update RSVP", 404);
    return result;
  }

  /** ---------------- ATTENDANCE ---------------- **/
  async markAttendance(data: MeetingAttendeeInput, userId: string) {
    if (!data.meetingId) throw new AppError("Meeting ID is required", 400);
    try {
      return await meetingAttendeeRepo.attendance(data, userId);
    } catch (error) {
      throw new AppError("Failed to mark attendance. Check meeting or user.", 400);
    }
  }

  /** ---------------- GET ATTENDANCE LIST ---------------- **/
  async getAttendance(meetingId: string) {
    if (!meetingId) throw new AppError("Meeting ID is required", 400);
    const attendees = await meetingAttendeeRepo.getAttendance(meetingId);
    if (!attendees || attendees.length === 0) throw new AppError("No attendees found", 404);
    return attendees;
  }

  /** ---------------- ADD PARTICIPANT ---------------- **/
  async addParticipant(data: MeetingAttendeeInput) {
    if (!data.meetingId) throw new AppError("Meeting ID is required", 400);
    if (!data.email && !data.userId) {
      throw new AppError("At least one of email or userId is required to add participant", 400);
    }
    return await meetingAttendeeRepo.addParticipant(data);
  }

  /** ---------------- UPDATE PARTICIPANT ---------------- **/
  async updateParticipant(attendeeId: string, data: UpdateMeetingAttendeeInput) {
    if (!attendeeId) throw new AppError("Attendee ID is required", 400);
    return await meetingAttendeeRepo.updateParticipant(attendeeId, data);
  }

  /** ---------------- REMOVE PARTICIPANT ---------------- **/
  async removeParticipant(attendeeId: string) {
    if (!attendeeId) throw new AppError("Attendee ID is required", 400);
    try {
      return await meetingAttendeeRepo.removeParticipant(attendeeId);
    } catch (error) {
      throw new AppError("Failed to remove participant. Check if attendee exists.", 404);
    }
  }

  /** ---------------- ATTENDANCE HISTORY ---------------- **/
  async getAttendanceHistory(userId: string) {
    if (!userId) throw new AppError("User ID is required", 400);
    const history = await meetingAttendeeRepo.attendenceHistory(userId);
    if (!history || history.length === 0) throw new AppError("No attendance history found", 404);
    return history;
  }

  /** ---------------- MEETING STATUS COUNT ---------------- **/
  async getMeetingStatusCount() {
    const result = await meetingAttendeeRepo.meetingStatusCount();
    if (!result || result.length === 0) {
      throw new AppError("No meeting data found for status count", 404);
    }

    // Transform result for cleaner API response
    const statusSummary = result.map(item => ({
      status: item.status,
      count: item._count
    }));

    return statusSummary;
  }
}
