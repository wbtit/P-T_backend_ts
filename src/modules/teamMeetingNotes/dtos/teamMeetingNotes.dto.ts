import { Prisma, TeamMeetingNoteVisibility } from "@prisma/client";
import z from "zod";

export const TeamMeetingNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  meetingId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  visibility: z.nativeEnum(TeamMeetingNoteVisibility).optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const TeamMeetingNoteUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  visibility: z.nativeEnum(TeamMeetingNoteVisibility).optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export type CreateTeamMeetingNoteInput = z.infer<typeof TeamMeetingNoteSchema> & {
  createdById: string;
};
export type UpdateTeamMeetingNoteInput = z.infer<typeof TeamMeetingNoteUpdateSchema>;
