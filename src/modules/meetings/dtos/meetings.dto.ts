import { Prisma,MeetingStatus,RSVPStatus,MeetingRole}from "@prisma/client";
import z from "zod";


const participantsSchema = z.object({
    userId: z.string().optional(),
    email: z.string(),
    rsvp:z.enum(RSVPStatus),
    role:z.enum(MeetingRole)
})
export const CreateMeetingSchema = z.object({
    title: z.string().min(1, "Title is required"),
    agenda: z.string(),
    description: z.string().optional(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required").optional(),
    link: z.string(),
    files: z
              .union([
                z.array(z.any()),
                z.literal(null),
              ])
              .transform((val) => (val === null ? Prisma.JsonNull : val))
              .optional(),
    status:z.enum(MeetingStatus),
    reminderSent: z.boolean().optional(),
    participantsSchema: z.array(participantsSchema).min(1, "At least one participant is required")
})
export const UpdateMeetingSchema =CreateMeetingSchema.partial();

export type CreateMeetingInput = z.infer<typeof CreateMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof UpdateMeetingSchema>;


export const MeetingAttendeeSchema = z.object({
    meetingId: z.string().min(1, "Meeting ID is required"),
    email: z.string(),
    userId: z.string().optional(),
    rsvp:z.enum(RSVPStatus),
    joined:z.boolean(),
    role:z.enum(MeetingRole)
})

export const UpdateMeetingAttendeeSchema =MeetingAttendeeSchema.partial();

export type MeetingAttendeeInput = z.infer<typeof MeetingAttendeeSchema>;
export type UpdateMeetingAttendeeInput = z.infer<typeof UpdateMeetingAttendeeSchema>;
