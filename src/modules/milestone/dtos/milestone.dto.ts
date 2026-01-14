import z from "zod";
import { Stage, Status} from "@prisma/client";


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
    subject:z.string(),
    description:z.string()  
})
export const updateMileStoneSchema=createMileStoneSchema.partial();

export type CreateMileStoneDto= z.infer<typeof createMileStoneSchema>
export type UpdateMileStoneDto= {id:string} & z.infer<typeof updateMileStoneSchema>
