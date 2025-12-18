import { Prisma,State } from "@prisma/client";
import z from "zod"

const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform(val => val === true || val === "true");

/* -------------------- RFI DTO -------------------- */
export const RFISchema = z.object({
  fabricator_id: z.string(),
  project_id: z.string(),
  recepient_id: z.string(),
  sender_id: z.string(),
  status: zBooleanString,
  subject: z.string(),
  description: z.string(),
  isAproovedByAdmin:z.string(),
  files: z
          .union([
            z.array(z.any()),
            z.literal(null),
          ])
          .transform((val) => (val === null ? Prisma.JsonNull : val))
          .optional(),
});
export const UpdateRFISchema= RFISchema.partial();

export type CreateRFIDto =z.infer<typeof RFISchema>;
export type UpdateRFIDto = z.infer<typeof UpdateRFISchema>;



/* -------------------- RFIResponse DTO -------------------- */
export const RFIResponseSchema = z.object({
  files: z
          .union([
            z.array(z.any()),
            z.literal(null),
          ])
          .transform((val) => (val === null ? Prisma.JsonNull : val))
          .optional(),
  responseState: z.enum(State).optional(),
wbtStatus: z.enum(State).default("OPEN"),
  reason:z.string().optional(),
  rfiId: z.string(),
  parentResponseId: z.string().optional()
});
export const UpdateRFIResponseDto=RFIResponseSchema.partial();

export type CreateRfiResDto=z.infer<typeof RFIResponseSchema>;
export type UpdateRfiResDto=z.infer<typeof UpdateRFIResponseDto>;
