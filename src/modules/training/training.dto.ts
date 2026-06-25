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
