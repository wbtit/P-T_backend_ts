import z from "zod";

export const createLineItemGroupSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    estimationId: z.string(),
    notes: z.string().optional(),
    divisor: z.number().optional()
})
export const updateLineItemGroupSchema = createLineItemGroupSchema.partial();

export type lineItemGroupDto = z.infer<typeof createLineItemGroupSchema>;
export type updateLineItemGroupDto = z.infer<typeof updateLineItemGroupSchema>;


export const createLineItemSchema = z.object({
    scopeOfWork: z.string(),
    remarks: z.string(),
    quantity: z.number().optional(),
    hoursPerQty: z.number().optional(),
    totalHours: z.number().optional(),
    unitCost: z.number().optional(),
    groupId: z.string(),
})
export const updateLineItemSchema = createLineItemSchema.partial();

export type lineItemDto = z.infer<typeof createLineItemSchema>;
export type updateLineItemDto = z.infer<typeof updateLineItemSchema>;
