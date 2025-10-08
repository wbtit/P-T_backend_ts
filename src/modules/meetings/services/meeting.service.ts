import { MeetingRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import { 
  CreateMeetingInput, 
  UpdateMeetingInput 
} from "../dtos";
import { FileObject } from "../../../shared/fileType";
import { Response } from "express";
import path from "path";
import { streamFile } from "../../../utils/fileUtil";

const meetingRepo = new MeetingRepository();

export class MeetingService {
  /** --------------------- CREATE --------------------- **/
  async create(data: CreateMeetingInput, userId: string) {
    if (!data.title || !data.startTime || !data.endTime) {
      throw new AppError("Missing required meeting fields", 400);
    }
    return await meetingRepo.createMeeting(data, userId);
  }

  /** --------------------- GET ONE --------------------- **/
  async getById(id: string) {
    const meeting = await meetingRepo.get(id);
    if (!meeting) throw new AppError("Meeting not found", 404);
    return meeting;
  }

  /** --------------------- UPDATE --------------------- **/
  async update(id: string, data: UpdateMeetingInput) {
    const existing = await meetingRepo.get(id);
    if (!existing) throw new AppError("Meeting not found", 404);
    return await meetingRepo.Update(id, data);
  }

  /** --------------------- DELETE (SOFT CANCEL) --------------------- **/
  async delete(id: string) {
    const meeting = await meetingRepo.get(id);
    if (!meeting) throw new AppError("Meeting not found", 404);
    return await meetingRepo.delete(id);
  }

  /** --------------------- STATUS UPDATE --------------------- **/
  async updateStatus(meetingId: string, data: UpdateMeetingInput) {
    const meeting = await meetingRepo.get(meetingId);
    if (!meeting) throw new AppError("Meeting not found", 404);
    return await meetingRepo.updateStatus(data, meetingId);
  }

  /** --------------------- FETCH FOR USER --------------------- **/
  async getMeetingsOfUser(userId: string) {
    return await meetingRepo.getMeetingOfUser(userId);
  }

  async getUpcomingMeetings(userId: string) {
    return await meetingRepo.getUpcomingMeeting(userId);
  }

  async getPastMeetings(userId: string) {
    return await meetingRepo.getPastMeetings(userId);
  }

  /** --------------------- SUMMARY --------------------- **/
  async getSummary(meetingId: string) {
    const meeting = await meetingRepo.summary(meetingId);
    if (!meeting) throw new AppError("Meeting not found", 404);
    return meeting;
  }

  /** --------------------- FILE HANDLING --------------------- **/
  async getFile(meetingId: string, fileId: string) {
    const meeting = await meetingRepo.get(meetingId);
    if (!meeting) throw new AppError("Meeting not found", 404);

    const files = meeting.files as unknown as FileObject[];
    if (!files || files.length === 0)
      throw new AppError("No files found for this meeting", 404);

    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(meetingId: string, fileId: string, res: Response) {
    const meeting = await meetingRepo.get(meetingId);
    if (!meeting) throw new AppError("Meeting not found", 404);

    const files = meeting.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    const __dirname = path.resolve();
    const filePath = path.join(__dirname, fileObject.filename);

    return streamFile(res, filePath, fileObject.originalName);
  }
}
