import z from "zod";
import { Stage, Status, Prisma, mileStoneResponseStatus } from "@prisma/client";

const MILESTONE_TYPES = [
  "ANCHOR_BOLT",
  "MAIN_STEEL",
  "MAIN_STEEL_CONNECTION_DESIGN",
  "MISC_STEEL",
  "MISC_STEEL_CONNECTION_DESIGN",
  "MAIN_AND_MISC_STEEL",
  "MAIN_AND_MISC_STEEL_CONNECTION_DESIGN",
  "FOUNDATION_EMBEDS",
  "PANEL_EMBEDS",
  "OTHERS",
] as const;


const zDateString = z
  .union([z.string(), z.date(), z.literal("")])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  });

export const createMileStoneSchema=z.object({
    fabricator_id:z.string(),
    project_id:z.string(),
    approvalDate:zDateString,
    isConnectionDesign:z.boolean().optional(),
    CDApprovalDate:zDateString,
    CDTargetDate:zDateString,
    status:z.enum(Status),
    stage:z.enum(Stage),
    types:z.enum(MILESTONE_TYPES),
    subSubject:z.string().optional(),
    reason:z.string().optional(),
    completeionPercentage:z.number().min(0).max(100).default(0).optional(),
    subject:z.string(),
    description:z.string()  
})
export const updateMileStoneSchema=createMileStoneSchema.partial();

export const createMileStoneResponseSchema = z.object({
    mileStoneId: z.string(),
    mileStoneVersionId: z.string().uuid().optional(),
    parentResponseId: z.string().uuid().optional(),
    description: z.string().optional(),
    status: z.enum(mileStoneResponseStatus).optional(),
    files: z
      .union([
        z.array(z.any()),
        z.literal(null),
      ])
      .transform(val => (val === null ? Prisma.JsonNull : val))
      .optional(),

      CDAttachments: z
      .union([
        z.array(z.any()),
        z.literal(null),
      ])
      .transform(val => (val === null ? Prisma.JsonNull : val))
      .optional(),
});
    

export const updateMileStoneResponseStatusSchema = z.object({
    status: z.enum(mileStoneResponseStatus),
});

export type CreateMileStoneDto= z.infer<typeof createMileStoneSchema>
export type UpdateMileStoneDto= {id:string} & z.infer<typeof updateMileStoneSchema>
export type CreateMileStoneResponseDto = z.infer<typeof createMileStoneResponseSchema>
