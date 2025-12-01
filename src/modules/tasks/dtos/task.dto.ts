import z from "zod";
import { Stage, TaskStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const createTaskDto = z.object({
    name: z.string().min(1, "Task name is required"),
    description: z.string().min(1, "Task description is required"),
    mileStone_id:z.string().optional(),
    status: z.enum(TaskStatus),
    priority: z.number().min(1).max(5),
    due_date: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date()),
    start_date: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date()),
    duration: z.string(),
    userFault:z.string().optional(),
    stage: z.enum(Stage),
    project_id: z.string(),
    user_id: z.string(),
    departmentId: z.string(),
    reworkStartTime: z.date().nullable().optional(),
});
export const updateTaskDto = createTaskDto.partial()

 export type createTaskInput = z.infer<typeof createTaskDto>;
export type updateTaskInput = Partial<Omit<Prisma.TaskUpdateInput, "project_id">> & {
  project_id?: never; // exclude project_id from updates
};
