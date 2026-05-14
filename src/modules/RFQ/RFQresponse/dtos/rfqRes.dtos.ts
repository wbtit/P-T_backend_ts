import { Prisma } from '@prisma/client';
import z from "zod";
import { RFQStatus } from "@prisma/client";

export const RfqResponseSchema = z.object({
    rfqId: z.string(),
    userId: z.string(),
    parentResponseId:z.string().optional().nullable(),
    subject: z.string().optional(),
    description:z.string(),
    totalTonnageWithConnection: z.string().optional().nullable(),
    totalTonnageWithoutConnection: z.string().optional().nullable(),
    PageNumbers: z.string().optional().nullable(),
    status: z.enum(RFQStatus).optional(),
    wbtStatus: z.enum(RFQStatus).optional(),
    files: z
    .union([
      z.array(z.any()),
      z.literal(null),
    ])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),
    link: z.string().nullable().optional(),
});

export type CreateRFQResponseInput = z.infer<typeof RfqResponseSchema>;
export type GetRFQResponseInput = { id: string };
