import z from "zod";

export type TeamMemberRole='CHECKER'|
  'DETAILER'|
  'ERECTER'|
  'MODELER'|
  'DESIGNER'|
  'ESTIMATOR'|
  'GUEST'


export const CreateTeamSchema=z.object({
    name:z.string().min(2).max(100),
    managerID:z.string(),
    departmentID:z.string()
})

export const AddTeamMembersSchema=z.object({
    teamId:z.string(),
    userId:z.string(),
    role:z.string()
})

export const RemoveTeamMembersSchema=z.object({
    teamId:z.string(),
    userId:z.string()
})

export const UpdateRoleSchema=z.object({
    teamId:z.string(),
    userId:z.string(),
    newRole:z.string()
})

export type CreateTeamInput=z.infer<typeof CreateTeamSchema>;
export type GetTeamInput={id:string};
export type UpdateTeamInput=Partial<CreateTeamInput>&{id:string};
export type DeleteTeamInput={id:string};

export type AddTeamMembersInput=z.infer<typeof AddTeamMembersSchema>;
export type RemoveTeamMembersInput=z.infer<typeof RemoveTeamMembersSchema>;
export type UpdateRoleInput=z.infer<typeof UpdateRoleSchema>;
