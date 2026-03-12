import { Prisma } from "@prisma/client";
import z from "zod";

export const TeamMeetingNoteResponseSchema = z.object({
  content: z.string().min(1),
  parentResponseId: z.string().uuid().optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const TeamMeetingNoteResponseUpdateSchema = TeamMeetingNoteResponseSchema.partial();

export type CreateTeamMeetingNoteResponseInput = z.infer<typeof TeamMeetingNoteResponseSchema>;
export type UpdateTeamMeetingNoteResponseInput = z.infer<typeof TeamMeetingNoteResponseUpdateSchema>;
