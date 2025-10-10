import z from "zod";
import { Prisma, Stage,State,SubResStatus } from "@prisma/client";

export const CreateDesignDrawingsSchema = z.object({
    projectId: z.string(),
    stage:z.enum(Stage),
    description: z.string(), 
    files: z
            .union([
              z.array(z.any()),
              z.literal(null),
            ])
            .transform((val) => (val === null ? Prisma.JsonNull : val))
            .optional(),

})

export const UpdateDesignDrawingsSchema = CreateDesignDrawingsSchema.partial()

export type CreateDesignDrawingsInput = z.infer<typeof CreateDesignDrawingsSchema>;
export type UpdateDesignDrawingsInput={id:string} & Partial<CreateDesignDrawingsInput>;

export const CreateDesignDrawingsResponsesSchema = z.object({
    designDrawingsId: z.string(),
    files: z
            .union([
              z.array(z.any()),
              z.literal(null),
            ])
            .transform((val) => (val === null ? Prisma.JsonNull : val))
            .optional(),
            reason: z.string().max(500),
    description: z.string().max(500),
    status:z.enum(SubResStatus),
    wbtStatus:z.enum(State),
    parentResponseId:z.string().optional()

})
export const UpdateDesignDrawingsResponsesSchema = CreateDesignDrawingsResponsesSchema.partial()

export type CreateDesignDrawingsResponsesInput = z.infer<typeof CreateDesignDrawingsResponsesSchema>;
export type UpdateDesignDrawingsResponsesInput={id:string} & Partial<CreateDesignDrawingsResponsesInput>;