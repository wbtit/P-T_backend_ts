import z from "zod";
import { Status, Stage, Tools, Prisma } from "@prisma/client";

// Converts "true"/"false" or boolean → boolean
const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform((val) => val === true || val === "true")
  .optional();

// Generic reusable date parser (accepts empty string also)
const zDateString = z
  .union([z.string(), z.date(), z.literal("")])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  });

// Generic number parser (string → number)
const zNumberString = z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .refine((v) => !isNaN(v), "Invalid number");

// ------------------------
// FINAL PROJECT SCHEMA
// ------------------------
export const CreateProjectSchema = z.object({
  projectNumber: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  fabricatorID: z.string().min(1),
  departmentID: z.string().min(1),
  teamID: z.string().min(1).optional(),
  managerID: z.string().min(1),
  rfqId: z.string().min(1).optional(),

  status: z.enum(Status),
  stage: z.enum(Stage),
  tools: z.enum(Tools),

  CDQuataionID: z.string().min(1).optional(),
  connectionDesignerID: z.string().min(1).optional(),

  files: z
    .union([z.array(z.any()), z.literal(null)])
    .transform((val) => (val === null ? Prisma.JsonNull : val))
    .optional(),

  // Boolean fields
  connectionDesign: zBooleanString,
  miscDesign: zBooleanString,
  customerDesign: zBooleanString,
  detailingMain: zBooleanString,
  detailingMisc: zBooleanString,
  
  //wbsTemplateIds:string[] optional field
  wbsTemplateIds: z.array(z.string()).optional(),


  // DATE fields
  startDate: zDateString,
  endDate: zDateString,
  approvalDate: zDateString,
  fabricationDate: zDateString,

  endDateChangeLog: z.array(z.string()).optional(),

  // NUMBER fields (FE sends string)
  estimatedHours: zNumberString,
  detailCheckingHours: zNumberString.optional(),
  detailingHours: zNumberString.optional(),
  executionCheckingHours: zNumberString.optional(),
  executionHours: zNumberString.optional(),
  modelCheckingHours: zNumberString.optional(),
  modelingHours: zNumberString.optional(),

  mailReminder: zBooleanString,
  submissionMailReminder: zBooleanString,
});

// UPDATE SCHEMA (partial)
export const UpdateProjectSchema = CreateProjectSchema.partial();

// TYPES
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateprojectInput = { id: string } & Partial<CreateProjectInput>;
export type GetProjectInput = { id: string };
export type DeleteProjectInput = { id: string };
