import z from "zod";
import { Stage, CoordinationDrawingStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

const zStringArrayFromFormData = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [val];
    }
  }
  return val;
}, z.array(z.string()).optional());

export const CreateCoordinationDrawingSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  stage: z.enum(Stage).optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const UpdateCoordinationDrawingSchema = CreateCoordinationDrawingSchema.partial();

export const CreateCoordinationDrawingResponseSchema = z.object({
  drawingId: z.string().uuid(),
  parentResponseId: z.string().uuid().optional(),
  description: z.string().min(1),
  status: z.enum(CoordinationDrawingStatus).optional(),
  wbtStatus: z.enum(CoordinationDrawingStatus).optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const UpdateCoordinationDrawingResponseSchema = CreateCoordinationDrawingResponseSchema.partial();

export type CreateCoordinationDrawingInput = z.infer<typeof CreateCoordinationDrawingSchema>;
export type UpdateCoordinationDrawingInput = z.infer<typeof UpdateCoordinationDrawingSchema>;
export type CreateCoordinationDrawingResponseInput = z.infer<typeof CreateCoordinationDrawingResponseSchema>;
export type UpdateCoordinationDrawingResponseInput = z.infer<typeof UpdateCoordinationDrawingResponseSchema>;
export type GetCoordinationDrawingInput = { id: string };
export type GetCoordinationDrawingResponseInput = { id: string };