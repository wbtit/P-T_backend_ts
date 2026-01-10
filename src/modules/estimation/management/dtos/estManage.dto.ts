import { z } from "zod";
import { EstimationStatus, Prisma,projectComplexity } from "@prisma/client";

export const EstimationSchema = z.object({
    estimationNumber: z.string().min(1, "Estimation number is required"),
    fabricatorName: z.string().optional(),
    projectName: z.string().min(1, "Project name is required"),
    projectComplexity:z.enum(projectComplexity),
    description: z.string().optional(),
    estimateDate: z.coerce.date(), // coerce string/number to Date
    status: z.enum(EstimationStatus),
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
