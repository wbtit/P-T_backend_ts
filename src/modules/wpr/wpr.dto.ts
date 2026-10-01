import z from "zod";

export const WprProjectParamsSchema = z.object({
  projectId: z.uuid(),
});
export type WprProjectParams = z.infer<typeof WprProjectParamsSchema>;

/** weekEnding: an optional YYYY-MM-DD date; the service snaps it to that week's Sunday. */
export const WprReportQuerySchema = z.object({
  weekEnding: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekEnding must be YYYY-MM-DD")
    .refine((v) => !isNaN(new Date(v).getTime()), "weekEnding must be a valid date")
    .optional(),
});
export type WprReportQuery = z.infer<typeof WprReportQuerySchema>;

export const WprDeliveriesQuerySchema = z.object({
  fabricatorId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  status: z.enum(["PENDING", "SENT", "FAILED", "SKIPPED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type WprDeliveriesQuery = z.infer<typeof WprDeliveriesQuerySchema>;
