import { Stage, WbsDiscipline } from "@prisma/client";
import { z } from "zod";

/**
 * ================================
 * PROJECT BUNDLE SELECTION
 * ================================
 * User selects bundles for a project
 */
export const ProjectBundleSelectionSchema = z.object({
  projectId: z.string().uuid(),
  bundleKeys: z.array(z.string()).min(1, "At least one bundle must be selected"),
});

export type ProjectBundleSelectionInput =
  z.infer<typeof ProjectBundleSelectionSchema>;

/**
 * ================================
 * PROJECT WBS AGGREGATE UPDATE
 * ================================
 * Used internally when recalculating stats
 * or explicitly updating aggregates
 */
export const UpdateProjectWbsSchema = z.object({
  totalQtyNo: z.number().min(0),
  totalExecHr: z.number().min(0),
  totalCheckHr: z.number().min(0),
  totalExecHrWithRework: z.number().min(0),
  totalCheckHrWithRework: z.number().min(0),
});

export type UpdateProjectWbsInput =
  z.infer<typeof UpdateProjectWbsSchema>;

/**
 * ================================
 * QUERY / FILTER DTO (OPTIONAL)
 * ================================
 * For dashboard / analytics queries
 */
export const ProjectWbsQuerySchema = z.object({
  projectId: z.string().uuid(),
  stage: z.enum(Stage),
  discipline: z.enum(WbsDiscipline).optional(), // EXECUTION | CHECKING
  bundleKey: z.string().optional(),
});

export type ProjectWbsQueryInput =
  z.infer<typeof ProjectWbsQuerySchema>;
