import z from "zod";

export const createCommentSchema=z.object({
    data:z.string(),
    task_id:z.string().optional(),
    estimationTaskId:z.string().optional(),
    acknowledged:z.boolean(),
    acknowledgedTime:z.date()
})

export type commentDto= z.infer<typeof createCommentSchema>;
