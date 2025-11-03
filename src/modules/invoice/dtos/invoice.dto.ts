import { z } from "zod";

export const createInvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  sacCode: z.string().optional(),
  unit: z.number().int().optional(),
  rateUSD: z.number().optional(),
  totalUSD: z.number().optional(),
  remarks: z.string().optional(),
});

export const updateInvoiceItemSchema = createInvoiceItemSchema.partial();
export type createInvoceData= z.infer<typeof createInvoiceItemSchema>
export type updateInvoiceData = z.infer<typeof updateInvoiceItemSchema>


export const createAccountInfoSchema = z.object({
  abaRoutingNumber: z.string().min(1),
  accountNumber: z.string().min(1),
  accountType: z.string().min(1),
  beneficiaryInfo: z.string().min(1),
  beneficiaryAddress: z.string().min(1),
  bankInfo: z.string().min(1),
  bankAddress: z.string().min(1),
});

export const updateAccountInfoSchema = createAccountInfoSchema.partial();
export type createAccountInfoSchemaData =z.infer<typeof createAccountInfoSchema>
export type updateAccountInfoSchemaData = z.infer<typeof updateAccountInfoSchema>


