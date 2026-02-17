import { Prisma,FabricatirStage } from "@prisma/client";
import z from "zod";

const zStringArrayFromForm = z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed) return undefined;
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
        }
        return [trimmed];
    }
    return val;
}, z.array(z.string()));

export const CreateFabricatorSchema=z.object({
    fabName:z.string().min(1,{message:"Fabricator name is required"}),
    website:z.string({message:"Invalid website URL"}).optional(),
    drive:z.string({message:"Invalid drive link"}).optional(),
    fabricatPercentage:z.coerce.number().optional(),
    approvalPercentage:z.coerce.number().optional(),
    paymenTDueDate:z.coerce.number().optional(),
    SAC:z.string().optional(),
    currencyType:z.string().optional(),
    accountId:z.string().optional(),
    fabStage:z.enum(FabricatirStage),
    pointOfContact: zStringArrayFromForm.optional(),
    wbtFabricatorPointOfContact: zStringArrayFromForm.optional(),
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
