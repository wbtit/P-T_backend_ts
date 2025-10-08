import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { MeetingService } from "../services";

const meetingService = new MeetingService();

export class MeetingController {
  // CREATE MEETING
  async handleCreateMeeting(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: userId } = req.user;

    const meeting = await meetingService.create({
      ...req.body,
    }, userId);

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

    res.status(200).json({
      status: "success",
      data: updatedMeeting,
    });
  }

  // DELETE (SOFT CANCEL) MEETING
  async handleDeleteMeeting(req: Request, res: Response) {
    const { id } = req.params;

    const deletedMeeting = await meetingService.delete(id);

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
