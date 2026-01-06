import { access } from "fs";
import { z } from "zod";



export const createInvoiceItemSchema = z.object({
  description: z.string(),
  sacCode: z.string().optional(),
  unit: z.number().int().optional(),
  rateUSD: z.number().optional(),
  totalUSD: z.number().optional(),
  remarks: z.string().optional(),
});

export const updateInvoiceItemSchema = createInvoiceItemSchema.partial();
export type createInvoiceItemSchemaData =z.infer<typeof createInvoiceItemSchema>
export type updateInvoiceItemSchema = z.infer<typeof updateInvoiceItemSchema>


export const createAccountInfoSchema = z.object({
  abaRoutingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  paymentMethod:z.string().optional(),
  institutionNumber:z.string().optional(),
  transitNumber:z.string().optional(),
  bankName:z.string().optional(),
  accountType: z.string().optional(),
  beneficiaryInfo: z.string().optional(),
  beneficiaryAddress: z.string().optional(),
  bankInfo: z.string().optional(),
  bankAddress: z.string().optional(),
});

export const updateAccountInfoSchema = createAccountInfoSchema.partial();
export type createAccountInfoSchemaData =z.infer<typeof createAccountInfoSchema>
export type updateAccountInfoSchemaData = z.infer<typeof updateAccountInfoSchema>




export const createInvoiceSchema = z.object({
  projectId: z.string(),
  fabricatorId: z.string(),
  clientId: z.string().optional(),
  customerName: z.string().min(1),
  contactName: z.string().optional(),
  address: z.string().optional(),
  stateCode: z.string().optional(),
  GSTIN: z.string().optional(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().optional(),
  dateOfSupply: z.string().optional(),
  placeOfSupply: z.string().optional(),
  jobName: z.string().min(1),
  signature: z.any().optional(),
  currencyType: z.string(),
  totalInvoiceValue: z.number().default(0),
  totalInvoiceValueInWords: z.string().optional(),
  paymentStatus: z.boolean().optional(),
invoiceItems: z.array(createInvoiceItemSchema).optional(),
  accountInfo: z.array(createAccountInfoSchema).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();
export type createInvoceData= z.infer<typeof createInvoiceSchema>
export type updateInvoiceData = z.infer<typeof updateInvoiceSchema>









