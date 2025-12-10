import { Prisma, Stage } from "@prisma/client";
import z from "zod"

export const NoteSchema = z.object({
    content: z.string().min(2).max(100),
    stage: z.enum(Stage),
    projectId: z.string(),
    files: z
            .union([
              z.array(z.any()),
              z.literal(null),
            ])
            .transform((val) => (val === null ? Prisma.JsonNull : val))
            .optional(),
});

export const NoteUpdateSchema = NoteSchema.partial();

export type CreateNoteInput = z.infer<typeof NoteSchema>;
export type UpdateNoteInput = z.infer<typeof NoteUpdateSchema>;