import { Activity, Stage } from "@prisma/client";
import z from "zod";

export const WBSSchema = z.object({
    projectId: z.string(),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    stage:z.enum(Stage),
    type:z.enum(Activity)
});

export const UpdateWBSSchema = z.object({
    totalQtyNo: z.number().min(0),
    totalExecHr: z.number().min(0),
    totalCheckHr: z.number().min(0),
    totalExecHrWithRework: z.number().min(0),
    totalCheckHrWithRework: z.number().min(0)
})

export type WBSInput = z.infer<typeof WBSSchema>;
export type UpdateWBSInput = z.infer<typeof UpdateWBSSchema>;