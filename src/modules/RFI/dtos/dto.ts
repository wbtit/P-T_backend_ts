import { Prisma,State } from "@prisma/client";
import z from "zod"

const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform(val => val === true || val === "true");

const zStringArrayFromFormData = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [val];
    }
  }
  return val;
}, z.array(z.string().uuid()).optional());

/* -------------------- RFI DTO -------------------- */
export const RFISchema = z.object({
  fabricator_id: z.string(),
  project_id: z.string(),
  recepient_id: z.string().optional(),
  multipleRecipients: zStringArrayFromFormData,
  status: zBooleanString,
  subject: z.string(),
  description: z.string(),
  isAproovedByAdmin:z.string(),
  isConnectionDesign: zBooleanString.optional(),
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
