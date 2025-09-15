import z from "zod";
import { WorkSegmentType } from "@prisma/client";
export const  findWhSchema=z.object({
    task_id:z.string().optional(),
    user_id:z.string(),
})

export const createWhSchema=z.object({
    task_id:z.string().optional(),
    user_id:z.string(),
    type:z.enum(WorkSegmentType),
})
export const updateWhSchema=z.object({
    id:z.string(),
    duration_seconds:z.number().optional(),
})
export const FindMany=z.object({
    task_id:z.string(),
    user_id:z.string(),
})


export type FindWhDTO=z.infer<typeof findWhSchema>;
export type CreateWhDTO=z.infer<typeof createWhSchema>;
export type UpdateWhDTO=z.infer<typeof updateWhSchema>;
export type FindManyDTO=z.infer<typeof FindMany>;
