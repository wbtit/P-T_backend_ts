import z from "zod";
import { RFQStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const CreateRfqSchema = z.object({
  projectNumber: z.string().min(2).max(100),
  projectName: z.string().min(2).max(100),
  senderId: z.string(),
  recipientId: z.string(),
  salesPersonId: z.string().nullable().optional(),
  subject: z.string().min(2).max(100),
  description: z.string().min(2).max(500),
  status: z.enum(RFQStatus),   // 👈 use the Prisma enum here
  wbtStatus: z.enum(RFQStatus),
  connectionDesign: z.boolean(),
  customerDesign: z.boolean(),
  miscDesign: z.boolean(),
  createdById: z.string(),
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
