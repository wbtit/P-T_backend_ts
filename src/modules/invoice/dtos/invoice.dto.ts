import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";

const UUID_LIKE_REGEX =
  /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
};

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

const zUuidRequired = z.preprocess(
  trimString,
  z.string().refine((value) => UUID_LIKE_REGEX.test(value), "Invalid UUID")
);

const zUuidOptional = z.preprocess(
  (value) => emptyStringToUndefined(trimString(value)),
  z
    .string()
    .refine((value) => UUID_LIKE_REGEX.test(value), "Invalid UUID")
    .optional()
);

const zOptionalTrimmedString = z.preprocess(
  (value) => emptyStringToUndefined(trimString(value)),
  z.string().optional()
);

export const createInvoiceItemSchema = z.object({
  description: z.string(),
  sacCode: z.string().nullable().optional(),
  unit: z.number().int().optional(),
  rateUSD: z.number().optional(),
  totalUSD: z.number().optional(),
  remarks: z.string().nullable().optional(),
});

export const updateInvoiceItemSchema = createInvoiceItemSchema.partial();
export type createInvoiceItemSchemaData =z.infer<typeof createInvoiceItemSchema>
export type updateInvoiceItemSchema = z.infer<typeof updateInvoiceItemSchema>


export const createAccountInfoSchema = z.object({
  abaRoutingNumber: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountName: z.string().nullable().optional(),
  paymentMethod:z.string().nullable().optional(),
  institutionNumber:z.string().nullable().optional(),
  transitNumber:z.string().nullable().optional(),
  bankName:z.string().nullable().optional(),
  accountType: z.string().nullable().optional(),
  beneficiaryInfo: z.string().nullable().optional(),
  beneficiaryAddress: z.string().nullable().optional(),
  bankInfo: z.string().nullable().optional(),
  bankAddress: z.string().nullable().optional(),
});

export const updateAccountInfoSchema = createAccountInfoSchema.partial();
export type createAccountInfoSchemaData =z.infer<typeof createAccountInfoSchema>
export type updateAccountInfoSchemaData = z.infer<typeof updateAccountInfoSchema>

const invoiceSchemaFields = {
  projectId: zUuidRequired,
  fabricatorId: zUuidRequired,
  rfqId: zUuidOptional,
  changeOrderId: zUuidOptional,
  clientId: zUuidOptional,
  type: zOptionalTrimmedString,
  invoiceType: zOptionalTrimmedString,
  customerName: z.string().min(1),
  contactName: zOptionalTrimmedString,
  receiptId: zOptionalTrimmedString,
  address: zOptionalTrimmedString,
  stateCode: zOptionalTrimmedString,
  status:z.enum(InvoiceStatus).optional(),
  GSTIN: zOptionalTrimmedString,
  invoiceNumber: z.string().trim(),
  invoiceDate: z.string().optional(),
  dateOfSupply: z.string().optional(),
  placeOfSupply: zOptionalTrimmedString,
  jobName: z.string().min(1),
  signature: z.any().optional(),
  currencyType: z.string(),
  totalInvoiceValue: z.number().default(0),
  totalInvoiceValueInWords: zOptionalTrimmedString,
  paymentStatus: z.boolean().optional(),
  invoiceItems: z.array(createInvoiceItemSchema).optional(),
  accountInfo: z.array(createAccountInfoSchema).optional(),
};

const createInvoiceBaseSchema = z.object(invoiceSchemaFields);
const updateInvoiceBaseSchema = createInvoiceBaseSchema.partial();

type CreateInvoiceRaw = z.infer<typeof createInvoiceBaseSchema>;
type UpdateInvoiceRaw = z.infer<typeof updateInvoiceBaseSchema>;

const normalizeInvoiceInput = <
  T extends {
    invoiceType?: string | null;
    receiptId?: string | null;
    contactName?: string | null;
    type?: string | null;
  }
>(input: T) => {
  const { invoiceType, receiptId, contactName, type, ...data } = input;

  return {
    ...data,
    type: type ?? invoiceType,
    contactName: contactName ?? receiptId,
  };
};

export const createInvoiceSchema = createInvoiceBaseSchema.transform(
  (input): Omit<CreateInvoiceRaw, "invoiceType" | "receiptId" | "contactName" | "type"> & {
    type?: string | null;
    contactName?: string | null;
  } => normalizeInvoiceInput(input)
);

export const updateInvoiceSchema = updateInvoiceBaseSchema.transform(
  (input): Omit<UpdateInvoiceRaw, "invoiceType" | "receiptId" | "contactName" | "type"> & {
    type?: string | null;
    contactName?: string | null;
  } => normalizeInvoiceInput(input)
);
export type createInvoceData= z.infer<typeof createInvoiceSchema>
export type updateInvoiceData = z.infer<typeof updateInvoiceSchema>
