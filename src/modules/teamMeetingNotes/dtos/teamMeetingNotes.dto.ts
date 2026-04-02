import { Prisma } from "@prisma/client";
import z from "zod";

const flagsSchema = z
  .union([z.array(z.any()), z.literal(null)])
  .transform((val) => (val === null ? Prisma.JsonNull : val))
  .optional();

export const TeamMeetingNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  meetingId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  taggedUserIds: z.array(z.string().uuid()).optional(),
  flags: flagsSchema,
  colorCode: z.string().optional(),
  priority: z.coerce.number().int().optional(),
  read: z.coerce.boolean().optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const TeamMeetingNoteUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  taggedUserIds: z.array(z.string().uuid()).optional(),
  flags: flagsSchema,
  colorCode: z.string().optional(),
  priority: z.coerce.number().int().optional(),
  read: z.coerce.boolean().optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export type CreateTeamMeetingNoteInput = z.infer<typeof TeamMeetingNoteSchema> & {
  createdById: string;
};
export type UpdateTeamMeetingNoteInput = z.infer<typeof TeamMeetingNoteUpdateSchema>;
