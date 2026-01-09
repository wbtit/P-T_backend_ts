import z from "zod";
import { Activity, Stage } from "@prisma/client";

export const CreateWbsBundleTemplateDto = z.object({
  bundleKey: z.string().min(3), // MAIN_STEEL_PLACEMENT
  name: z.string().min(3),
  category: z.enum(Activity), // MODELING | DETAILING | ERECTION | CHECKING
  stage: z.enum(Stage),
});

export const UpdateWbsBundleTemplateDto = z.object({
  name: z.string().min(3).optional(),
  isActive: z.boolean().optional(),
});

export type CreateWbsBundleTemplateInput =
  z.infer<typeof CreateWbsBundleTemplateDto>;
export type UpdateWbsBundleTemplateInput =
  z.infer<typeof UpdateWbsBundleTemplateDto>;
