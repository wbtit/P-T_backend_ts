import z from "zod";
import { Stage, Status, Prisma, mileStoneResponseStatus } from "@prisma/client";


const zDateString = z
  .union([z.string(), z.date(), z.literal("")])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  });

export const createMileStoneSchema=z.object({
    fabricator_id:z.string(),
    project_id:z.string(),
    approvalDate:zDateString,
    status:z.enum(Status),
    stage:z.enum(Stage),
    reason:z.string().optional(),
    completeionPercentage:z.number().min(0).max(100).default(0).optional(),
    subject:z.string(),
    description:z.string()  
})
export const updateMileStoneSchema=createMileStoneSchema.partial();

export const createMileStoneResponseSchema = z.object({
    mileStoneId: z.string(),
    mileStoneVersionId: z.string().uuid().optional(),
    parentResponseId: z.string().uuid().optional(),
    description: z.string().optional(),
    status: z.enum(mileStoneResponseStatus).optional(),
    files: z
      .union([
        z.array(z.any()),
        z.literal(null),
      ])
      .transform(val => (val === null ? Prisma.JsonNull : val))
      .optional(),
});

export const updateMileStoneResponseStatusSchema = z.object({
    status: z.enum(mileStoneResponseStatus),
});

export type CreateMileStoneDto= z.infer<typeof createMileStoneSchema>
export type UpdateMileStoneDto= {id:string} & z.infer<typeof updateMileStoneSchema>
export type CreateMileStoneResponseDto = z.infer<typeof createMileStoneResponseSchema>
