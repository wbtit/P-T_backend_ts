import z from "zod"


export const createDeptZod = z.object({
    name: z.string().min(2).max(100),
   managerIds: z.array(z.string()).min(1)
});

export type CreateDeptInput = z.infer<typeof createDeptZod>;
export type UpdateDeptInput = Partial<CreateDeptInput> & { id: string };
export type GetDeptInput = { id: string };
export type DeleteDeptInput = { id: string };
export type FindByNameInput = { name: string };
