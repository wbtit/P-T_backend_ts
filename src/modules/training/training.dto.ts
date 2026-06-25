import z from "zod";

export const raiseTrainingRequestDto = z.object({
  taskId: z.string().uuid(),
  topic: z.string().min(1),
  reason: z.string().min(1)
});

export const approveTrainingRequestDto = z.object({
  estimatedHours: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  dueDate: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date()),
  name: z.string().min(1),         
  description: z.string().min(1)   
});

export const rejectTrainingRequestDto = z.object({
  rejectionReason: z.string().min(1)
});

export const createTrainingBatchDto = z.object({
  topic: z.string().min(1),
  departmentId: z.string().uuid(),
  requestIds: z.array(z.string().uuid()).min(1),
  trainerId: z.string().uuid(),
  estimatedHours: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  dueDate: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date()),
  sessionName: z.string().min(1),
  sessionDescription: z.string().min(1),
  trainingProjectId: z.string().uuid(),
  priority: z.number().min(1).max(5).default(3)
});
