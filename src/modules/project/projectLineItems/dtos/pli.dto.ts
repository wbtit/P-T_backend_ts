import { Stage } from '@prisma/client';
import z from 'zod';

export const ProjectLineItemSchema = z.object({
    description: z.string().min(2).max(1000),
    unitTime: z.number().min(0),
    checkUnitTime: z.float32(),
    checkHrWithRework: z.float32(),
    execHrWithRework: z.float32(),
    qtyNo: z.number().min(0),
    checkHr: z.float32(),
    execHr: z.float32(),
    parentTemplateKey: z.string(),
    stage: z.enum(Stage),
});

export const UpdateProjectLineItemSchema = ProjectLineItemSchema.partial();

export type PliInput = z.infer<typeof ProjectLineItemSchema>;
export type UpdatePliInput = z.infer<typeof UpdateProjectLineItemSchema>;
export type GetPliByStageInput = {projectID:string,
    workBreakDownID:string,
    stage:Stage
}
