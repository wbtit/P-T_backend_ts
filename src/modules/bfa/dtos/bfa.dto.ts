import { z } from "zod";
import { BfaStatus } from "@prisma/client";

export const createBfaDto = z.object({
  submittalID: z.string().uuid("Invalid submittalID UUID"),
  subject: z.string(),
  description: z.string().optional(),
  status: z.nativeEnum(BfaStatus).default(BfaStatus.partial).optional(),
});

export const updateBfaDto = z.object({
  subject: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(BfaStatus).optional(),
});

export type CreateBfaDto = z.infer<typeof createBfaDto>;
export type UpdateBfaDto = z.infer<typeof updateBfaDto>;
