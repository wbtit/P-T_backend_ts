import { Prisma } from '@prisma/client';
import z from "zod";
import { RFQStatus } from "@prisma/client";

export const RfqResponseSchema = z.object({
    rfqId: z.string(),
    userId: z.string(),
    parentResponseId:z.string().optional().nullable(),
    description:z.string(),
    status: z.enum(RFQStatus),
    wbtStatus: z.enum(RFQStatus),
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
