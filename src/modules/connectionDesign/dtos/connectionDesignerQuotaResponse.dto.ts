import { z } from "zod";
import { QuotaResponseStatus } from "@prisma/client";

export const CreateConnectionDesignerQuotaResponseSchema = z.object({
  quotaId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  mainSteelPrice: z.coerce.number().optional(),
  miscSteelPrice: z.coerce.number().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(QuotaResponseStatus).optional(),
});

export const UpdateConnectionDesignerQuotaResponseSchema = CreateConnectionDesignerQuotaResponseSchema.partial();

export type CreateConnectionDesignerQuotaResponseInput = z.infer<typeof CreateConnectionDesignerQuotaResponseSchema>;
export type UpdateConnectionDesignerQuotaResponseInput = z.infer<typeof UpdateConnectionDesignerQuotaResponseSchema>;
export type GetConnectionDesignerQuotaResponseInput = { id: string };
export type DeleteConnectionDesignerQuotaResponseInput = { id: string };
