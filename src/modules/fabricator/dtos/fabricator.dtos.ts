import z from "zod";

export const CreateFabricatorSchema=z.object({
    fabName:z.string().min(1,{message:"Fabricator name is required"}),
    website:z.url({message:"Invalid website URL"}).nullable().optional(),
    drive:z.url({message:"Invalid drive link"}).nullable().optional(),
    files:z.union([
        z.array(z.any()),//array of JSON
    ]).optional().default([]),
});

export const UpdateFabricatorSchema=CreateFabricatorSchema.partial();
export const FabricatorIdSchema=z.object({
    id:z.string(),
})

// Export TS types

export type CreateFabricatorInput=z.infer<typeof CreateFabricatorSchema>;
export type UpdateFabricatorInput=z.infer<typeof UpdateFabricatorSchema>;
export type GetFabricatorInput=z.infer<typeof FabricatorIdSchema>
export type DeleteFabricatorInput=z.infer<typeof FabricatorIdSchema>