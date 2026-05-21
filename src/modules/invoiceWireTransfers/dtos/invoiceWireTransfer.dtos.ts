import z from "zod";
import { Prisma } from "@prisma/client";

export const CreateInvoiceWireTransferSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1),
  subject: z.string().max(255).optional(),
  description: z.string().optional(),
  date: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional()
  ),
  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
});

export const UpdateInvoiceWireTransferSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).optional(),
  subject: z.string().max(255).optional(),
  description: z.string().optional(),
  date: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional()
  ),
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
