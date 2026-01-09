import z from "zod";

export const CreateWbsLineItemTemplateDto = z.object({
  wbsTemplateId: z.string().uuid(),

  description: z.string().min(3),
  unitTime: z.number().min(0),
  checkUnitTime: z.number().min(0),
  templateKey: z.string().min(3),
});

export const UpdateWbsLineItemTemplateDto = z.object({
  description: z.string().min(3).optional(),
  unitTime: z.number().min(0).optional(),
  checkUnitTime: z.number().min(0).optional(),
});

export type CreateWbsLineItemTemplateInput =
  z.infer<typeof CreateWbsLineItemTemplateDto>;

export type UpdateWbsLineItemTemplateInput =
  z.infer<typeof UpdateWbsLineItemTemplateDto>;
