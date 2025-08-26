import z from "zod";

export const CreateTeamSchema=z.object({
    name:z.string().min(2).max(100),
    managerID:z.string(),
    departmentID:z.string()
})

export type CreateTeamInput=z.infer<typeof CreateTeamSchema>;
export type GetTeamInput={id:string};
export type UpdateTeamInput=Partial<CreateTeamInput>&{id:string};
export type DeleteTeamInput={id:string};