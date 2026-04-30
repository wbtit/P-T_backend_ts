import z from "zod";
import { Stage, ProjectProgressReportStatus } from "@prisma/client";
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

export const CreateProjectProgressReportSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  stage: z.enum(Stage).optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const UpdateProjectProgressReportSchema = CreateProjectProgressReportSchema.partial();

export const CreateProjectProgressReportResponseSchema = z.object({
  reportId: z.string().uuid(),
  parentResponseId: z.string().uuid().optional(),
  description: z.string().min(1),
  status: z.enum(ProjectProgressReportStatus).optional(),
  wbtStatus: z.enum(ProjectProgressReportStatus).optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const UpdateProjectProgressReportResponseSchema = CreateProjectProgressReportResponseSchema.partial();

export type CreateProjectProgressReportInput = z.infer<typeof CreateProjectProgressReportSchema>;
export type UpdateProjectProgressReportInput = z.infer<typeof UpdateProjectProgressReportSchema>;
export type CreateProjectProgressReportResponseInput = z.infer<typeof CreateProjectProgressReportResponseSchema>;
export type UpdateProjectProgressReportResponseInput = z.infer<typeof UpdateProjectProgressReportResponseSchema>;
export type GetProjectProgressReportInput = { id: string };
export type GetProjectProgressReportResponseInput = { id: string };