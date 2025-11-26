import z from "zod";

const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform((val) => val === true || val === "true");

export const ConnectionDesignerQuotaSchema = z.object({
  connectionDesignerId: z.string(),
  rfqId: z.string().nullable().optional(),
  bidprice: z.string().optional(),
  estimatedHours: z.string(),
  weeks: z.string(),
  approvalStatus: zBooleanString.optional(),
  approvalDate: z.preprocess(
    (v) => (typeof v === "string" ? new Date(v) : v),
    z.date().nullable().optional()
  ),
});

export const updateConnectionDesignerQuotaSchema = ConnectionDesignerQuotaSchema.partial();


export type CreateConnectionDesignerQuotaInput = z.infer<typeof ConnectionDesignerQuotaSchema>;
export type UpdateConnectionDesignerQuotaInput = z.infer<typeof updateConnectionDesignerQuotaSchema>;
export type GetConnectionDesignerQuotaInput = { id: string };
export type DeleteConnectionDesignerQuotaInput = { id: string };
