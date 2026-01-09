import z from "zod";

/**
 * ---------------------------------------
 * UPDATE PROJECT LINE ITEM
 * ---------------------------------------
 * Only mutable, project-specific fields
 */
export const UpdateProjectLineItemSchema = z.object({
  qtyNo: z.number().min(0).optional(),

  execHr: z.number().min(0).optional(),
  checkHr: z.number().min(0).optional(),

  execHrWithRework: z.number().min(0).optional(),
  checkHrWithRework: z.number().min(0).optional(),

  // Optional overrides (rare but allowed)
  unitTime: z.number().min(0).optional(),
  checkUnitTime: z.number().min(0).optional(),
});

/**
 * ---------------------------------------
 * BULK UPDATE LINE ITEMS
 * ---------------------------------------
 */
export const ProjectLineItemBulkSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),

      qtyNo: z.number().min(0).optional(),
      execHr: z.number().min(0).optional(),
      checkHr: z.number().min(0).optional(),

      execHrWithRework: z.number().min(0).optional(),
      checkHrWithRework: z.number().min(0).optional(),

      unitTime: z.number().min(0).optional(),
      checkUnitTime: z.number().min(0).optional(),
    })
  ),
});

export type UpdatePliInput = z.infer<
  typeof UpdateProjectLineItemSchema
>;
export type BulkUpdatePliInput = z.infer<
  typeof ProjectLineItemBulkSchema
>;
