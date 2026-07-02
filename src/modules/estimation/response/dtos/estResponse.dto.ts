import { Prisma, RFQResponseType } from "@prisma/client";
import z from "zod";

export const EstimationResponseSchema = z
  .object({
    message: z.string(),
    parentResponseId: z.string().optional().nullable(),
    type: z.nativeEnum(RFQResponseType).optional(),
    files: z
      .union([z.array(z.any()), z.literal(null)])
      .transform((val) => (val === null ? Prisma.JsonNull : val))
      .optional(),
  })
  .strict();

export type CreateEstimationResponseInput = z.infer<typeof EstimationResponseSchema>;

export type GetEstimationResponseByIdInput = {
  id: string;
};
