import z from "zod";
import { Status} from "@prisma/client";

export const createMileStoneSchema=z.object({
    fabricator_id:z.string(),
    project_id:z.string(),
    approvalDate:z.date().optional(),
    status:z.enum(Status),
    subject:z.string(),
    description:z.string()  
})
export const updateMileStoneSchema=createMileStoneSchema.partial();

export type CreateMileStoneDto= z.infer<typeof createMileStoneSchema>
export type UpdateMileStoneDto= {id:string} & z.infer<typeof updateMileStoneSchema>
