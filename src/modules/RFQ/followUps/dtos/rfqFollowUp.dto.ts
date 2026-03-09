import { Prisma } from "@prisma/client";
import z from "zod";

export const CreateRFQFollowUpSchema = z.object({
  description: z.string().min(1),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const UpdateRFQFollowUpSchema = z.object({
  description: z.string().min(1).optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export type CreateRFQFollowUpInput = z.infer<typeof CreateRFQFollowUpSchema>;
export type UpdateRFQFollowUpInput = z.infer<typeof UpdateRFQFollowUpSchema>;

