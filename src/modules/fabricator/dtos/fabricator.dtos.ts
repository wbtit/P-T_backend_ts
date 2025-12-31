import { Prisma } from "@prisma/client";
import z from "zod";

export const CreateFabricatorSchema=z.object({
    fabName:z.string().min(1,{message:"Fabricator name is required"}),
    website:z.string({message:"Invalid website URL"}).optional(),
    drive:z.string({message:"Invalid drive link"}).optional(),
    currencyType:z.string().optional(),
    accountId:z.string().optional(),
    files: z
                .union([
                  z.array(z.any()),
                  z.literal(null),
                ])
                .transform((val) => (val === null ? Prisma.JsonNull : val))
                .optional(),
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