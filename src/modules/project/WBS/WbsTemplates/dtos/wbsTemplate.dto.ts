import z from "zod";
import { WbsDiscipline } from "@prisma/client";

export const CreateWbsTemplateDto = z.object({
  name: z.string().min(3),
  templateKey: z.string().min(3),
  bundleKey: z.string(),
  discipline: z.enum(WbsDiscipline),
});

export const UpdateWbsTemplateDto = z.object({
  name: z.string().min(3).optional(),
  discipline: z.enum(WbsDiscipline).optional(),
});

export type CreateWbsTemplateInput =
  z.infer<typeof CreateWbsTemplateDto>;
export type UpdateWbsTemplateInput =
  z.infer<typeof UpdateWbsTemplateDto>;
