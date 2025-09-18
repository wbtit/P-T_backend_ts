import { z } from "zod";
import { Prisma, TaskStatus } from "@prisma/client";

export const EstimationTaskDTO = z.object({
  assignedById:z.string(),
  status: z.enum(TaskStatus),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().optional(),
  reviewNotes: z.string().optional(),
  estimationId: z.string(),
  assignedToId: z.string(),
  reviewedById: z.string().optional(),
  files: z
              .union([
                z.array(z.any()),
                z.literal(null),
              ])
              .transform((val) => (val === null ? Prisma.JsonNull : val))
              .optional(),
});

export const UpdateEstimationTask=EstimationTaskDTO.partial()

export type createEstimationTaskInput=z.infer<typeof EstimationTaskDTO>
export type updateEstimationTaskInput=z.infer<typeof UpdateEstimationTask>