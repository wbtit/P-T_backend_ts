import z from "zod";

export const createCommentSchema=z.object({
    data:z.string(),
    task_id:z.string().optional(),
    estimationTaskId:z.string().optional(),
    acknowledged:z.boolean().optional(),
    acknowledgedTime:z.date().optional()
})

export type commentDto= z.infer<typeof createCommentSchema>;
