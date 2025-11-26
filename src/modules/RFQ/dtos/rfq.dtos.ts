import z from "zod";
import { RFQStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform(val => val === true || val === "true");


export const CreateRfqSchema = z.object({
  projectNumber: z.string().min(2).max(100),
  projectName: z.string().min(2).max(100),
  bidPrice: z.string().optional(),
  fabricatorId: z.string().nullable().optional(),
  senderId: z.string().optional(),
  recipientId: z.string(),
  salesPersonId: z.string().optional(),
  subject: z.string().min(2).max(100),
  description: z.string().min(2).max(500),
  status: z.enum(RFQStatus).default("SENT"),  
  tools: z.string().optional(),
  wbtStatus: z.enum(RFQStatus).default("RECEIVED"),
  estimationDate: z
  .preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().nullable().optional()
  ),

  connectionDesign: zBooleanString,
  customerDesign: zBooleanString,
  miscDesign: zBooleanString,
  detailingMain: zBooleanString,
  detailingMisc: zBooleanString,

  createdById: z.string().optional(),
  files: z
      .union([
        z.array(z.any()),
        z.literal(null),
      ])
      .transform((val) => (val === null ? Prisma.JsonNull : val))
      .optional(),
      link: z.string().nullable().optional(),
});

export const UpdateRfqSchema = CreateRfqSchema.partial();

export type CreateRfqInput = z.infer<typeof CreateRfqSchema>;
export type UpdateRfqInput = z.infer<typeof UpdateRfqSchema>;
export type GetRfqInput = { id: string };
