import { z } from "zod";

export const ProjectAssistParamsSchema = z.object({
  projectId: z.uuid(),
});

export const ProjectAssistUserParamsSchema = z.object({
  projectId: z.uuid(),
  userId: z.uuid(),
});

export const CreateProjectAssistSchema = z.object({
  userId: z.uuid(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateProjectAssistSchema = z.object({
  isActive: z.boolean(),
});

export type CreateProjectAssistInput = z.infer<typeof CreateProjectAssistSchema>;
export type UpdateProjectAssistInput = z.infer<typeof UpdateProjectAssistSchema>;
