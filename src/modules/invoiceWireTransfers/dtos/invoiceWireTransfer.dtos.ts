import z from "zod";
import { Prisma } from "@prisma/client";

const optionalNullableTrimmedString = (maxLength: number) =>
  z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== "string") return val;

    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(maxLength).nullable().optional());

export const CreateInvoiceWireTransferSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).optional(),
  subject: optionalNullableTrimmedString(255),
  description: z.string().optional(),
  date: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional()
  ),
  status: z.boolean().optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const UpdateInvoiceWireTransferSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).optional(),
  subject: optionalNullableTrimmedString(255),
  description: z.string().optional(),
  date: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional()
  ),
  status: z.boolean().optional(),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const GetInvoiceWireTransferSchema = z.object({
  id: z.string().uuid(),
});

export type CreateInvoiceWireTransferInput = z.infer<typeof CreateInvoiceWireTransferSchema>;
export type UpdateInvoiceWireTransferInput = z.infer<typeof UpdateInvoiceWireTransferSchema>;
export type GetInvoiceWireTransferInput = z.infer<typeof GetInvoiceWireTransferSchema>;
