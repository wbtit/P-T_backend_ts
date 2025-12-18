import z from "zod";
import { COSTATUS, Prisma } from "@prisma/client";

export const CoResponseSchema = z.object({
  Status: z.enum(COSTATUS).default("NOT_REPLIED"),
  CoId: z.string().optional(),
  description: z.string().min(2).max(500),
  userId: z.string(),
  parentResponseId: z.string().optional(),       
    files: z
              .union([
                z.array(z.any()),
                z.literal(null),
              ])
              .transform((val) => (val === null ? Prisma.JsonNull : val))
              .optional(),
});
export const UpdateCoResponseSchema = CoResponseSchema.partial();

export type CreateCoResponseDto = z.infer<typeof CoResponseSchema>;
export type UpdateCoResponseDto = z.infer<typeof UpdateCoResponseSchema>;

