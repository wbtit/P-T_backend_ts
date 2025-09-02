import { z } from "zod";

export const JobStudySchema = z.object({
  description: z.string().min(1, "Description is required"),
  QtyNo: z.number().int().nonnegative("QtyNo must be a non-negative integer"),
  unitTime: z.number().nonnegative("Unit time must be >= 0"),
  execTime: z.number().nonnegative("Exec time must be >= 0"),
  projectId: z.string()
});

export const JobStudyArraySchema = z.array(JobStudySchema);
export const JobStudyRequestSchema = z.object({
  jobStudies: JobStudyArraySchema,
});
export type JobStudyRequestInput = z.infer<typeof JobStudyRequestSchema>;
export type JobStudyUpdateInput= z.infer<typeof JobStudySchema> & {id: string};
export type getJobStudyInput={ id: string };
