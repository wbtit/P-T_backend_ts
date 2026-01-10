import z from "zod";

const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform((val) => val === true || val === "true");

export const VendorQuotaSchema = z.object({
  vendorId: z.string(),
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

export const updateVendorQuotaSchema = VendorQuotaSchema.partial();


export type CreateVendorQuotaInput = z.infer<typeof VendorQuotaSchema>;
export type UpdateVendorQuotaInput = z.infer<typeof updateVendorQuotaSchema>;
export type GetVendorQuotaInput = { id: string };
export type DeleteVendorQuotaInput = { id: string };
