import { Router } from "express";
import { MeetingAttendeeController, MeetingController } from "./controller";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { 
  CreateMeetingSchema, 
  UpdateMeetingSchema,MeetingAttendeeSchema,UpdateMeetingAttendeeSchema, 
} from "./dtos";
import z from "zod";

const router = Router();
const meetingController = new MeetingController();

// ===========================================================
// MEETING ROUTES
// ===========================================================

// CREATE MEETING
router.post(
  "/",
  authMiddleware,
  validate({ body: CreateMeetingSchema }),
  meetingController.handleCreateMeeting.bind(meetingController)
);

// GET MEETING BY ID
router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  meetingController.handleGetMeetingById.bind(meetingController)
);

// UPDATE MEETING
router.put(
  "/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateMeetingSchema,
  }),
  meetingController.handleUpdateMeeting.bind(meetingController)
);

// DELETE MEETING (SOFT CANCEL)
router.delete(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  meetingController.handleDeleteMeeting.bind(meetingController)
);

// UPDATE MEETING STATUS
router.patch(
  "/:id/status",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateMeetingSchema, // Assuming same schema works for status update
  }),
  meetingController.handleUpdateMeetingStatus.bind(meetingController)
);

// GET MEETINGS FOR USER
router.get(
  "/user/me",
  authMiddleware,
  meetingController.handleGetMeetingsOfUser.bind(meetingController)
);

// GET UPCOMING MEETINGS FOR USER
router.get(
  "/user/me/upcoming",
  authMiddleware,
  meetingController.handleGetUpcomingMeetings.bind(meetingController)
);

// GET PAST MEETINGS FOR USER
router.get(
  "/user/me/past",
  authMiddleware,
  meetingController.handleGetPastMeetings.bind(meetingController)
);

// GET MEETING SUMMARY
router.get(
  "/:id/summary",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  meetingController.handleGetMeetingSummary.bind(meetingController)
);

// GET SPECIFIC FILE FROM MEETING
router.get(
  "/:meetingId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      meetingId: z.string(),
      fileId: z.string(),
    }),
  }),
  meetingController.handleGetFile.bind(meetingController)
);

// STREAM FILE FROM MEETING
router.get(
  "/viewFile/:meetingId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      meetingId: z.string(),
      fileId: z.string(),
    }),
  }),
  meetingController.handleViewFile.bind(meetingController)
);

// ===========================================================
// MEETING ATTENDEE ROUTES
// ===========================================================
const meetingAttendeeController = new MeetingAttendeeController();

// UPDATE RSVP
router.patch(
  "/:meetingId/rsvp",
  authMiddleware,
  validate({
    params: z.object({ meetingId: z.string() }),
    body: UpdateMeetingAttendeeSchema,
  }),
  meetingAttendeeController.handleUpdateRsvp.bind(meetingAttendeeController)
);

// MARK ATTENDANCE
router.post(
  "/attendance",
  authMiddleware,
  validate({ body: UpdateMeetingAttendeeSchema }),
  meetingAttendeeController.handleMarkAttendance.bind(meetingAttendeeController)
);

// GET ATTENDANCE LIST FOR A MEETING
router.get(
  "/:meetingId/attendance",
  authMiddleware,
  validate({ params: z.object({ meetingId: z.string() }) }),
  meetingAttendeeController.handleGetAttendance.bind(meetingAttendeeController)
);

// ADD PARTICIPANT TO MEETING
router.post(
  "/participants",
  authMiddleware,
  validate({ body: UpdateMeetingAttendeeSchema }),
  meetingAttendeeController.handleAddParticipant.bind(meetingAttendeeController)
);

// UPDATE PARTICIPANT DETAILS
router.put(
  "/participants/:attendeeId",
  authMiddleware,
  validate({
    params: z.object({ attendeeId: z.string() }),
    body: UpdateMeetingAttendeeSchema,
  }),
  meetingAttendeeController.handleUpdateParticipant.bind(meetingAttendeeController)
);

// REMOVE PARTICIPANT
router.delete(
  "/participants/:attendeeId",
  authMiddleware,
  validate({ params: z.object({ attendeeId: z.string() }) }),
  meetingAttendeeController.handleRemoveParticipant.bind(meetingAttendeeController)
);

// GET ATTENDANCE HISTORY FOR LOGGED-IN USER
router.get(
  "/attendance/history",
  authMiddleware,
  meetingAttendeeController.handleGetAttendanceHistory.bind(meetingAttendeeController)
);

// GET MEETING STATUS COUNT
router.get(
  "/status/count",
  authMiddleware,
  meetingAttendeeController.handleGetMeetingStatusCount.bind(meetingAttendeeController)
);

export default router;
