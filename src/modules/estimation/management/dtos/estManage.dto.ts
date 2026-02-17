import { z } from "zod";
import { EstimationStatus, Prisma,ProjectComplexity } from "@prisma/client";

export const EstimationSchema = z.object({
    estimationNumber: z.string().min(1, "Estimation number is required").optional(),
    fabricatorName: z.string().optional(),
    projectName: z.string().min(1, "Project name is required"),
    projectComplexity:z.enum(ProjectComplexity).optional(),
    description: z.string().optional(),
    estimateDate: z.coerce.date(), // coerce string/number to Date
    status: z.enum(EstimationStatus),
    inclusions: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return JSON.stringify(val);
      return val;
    }),
    exclusions: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return JSON.stringify(val);
      return val;
    }),
    assignedById: z.string().optional(),
    finalHours: z.number().optional(),
    finalWeeks: z.number().optional(),
    finalPrice: z.number().optional(),
    files: z
            .union([
              z.array(z.any()),
              z.literal(null),
            ])
            .transform((val) => (val === null ? Prisma.JsonNull : val))
            .optional(),
    rfqId: z.string().optional(),
    fabricatorId: z.string(),
    tools: z.string().optional(),
    startDate: z.coerce.date().optional(),
});
// For update (all fields optional)
export const UpdateEstimationDto = EstimationSchema.partial();


export type CreateEstimationDtoType = z.infer<typeof EstimationSchema>;
export type UpdateEstimationDtoType = z.infer<typeof UpdateEstimationDto>;
