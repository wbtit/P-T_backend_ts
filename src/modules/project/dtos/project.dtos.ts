import z from "zod";
import { Status, Stage, Tools, Prisma } from "@prisma/client";

const UUID_LIKE_REGEX =
  /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

const isUuidLike = (val: string) => UUID_LIKE_REGEX.test(val);

const trimString = (val: unknown) =>
  typeof val === "string" ? val.trim() : val;

const emptyStringToUndefined = (val: unknown) => {
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
};

const zUuidLikeRequired = z
  .preprocess(trimString, z.string().min(1))
  .refine(isUuidLike, "Invalid UUID");

const zUuidLikeOptional = z.preprocess(
  (val) => {
    return emptyStringToUndefined(trimString(val));
  },
  z.string().refine(isUuidLike, "Invalid UUID").optional()
);

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

const zStringArray = z
  .union([z.array(z.string()), z.string(), z.literal(""), z.null()])
  .transform((val) => {
    if (val === null || val === "") return undefined;
    if (Array.isArray(val)) return val.map((v) => v?.trim?.() ?? v).filter(Boolean);
    if (typeof val === "string" && val.includes(",")) {
      return val
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [val.trim()].filter(Boolean);
  });

// ------------------------
// FINAL PROJECT SCHEMA
// ------------------------
export const CreateProjectSchema = z.object({
  projectNumber: z.string(),
  name: z.string(),
  description: z.string(),
  fabricatorID: zUuidLikeRequired,
  departmentID: zUuidLikeRequired,
  teamID: zUuidLikeOptional,
  managerID: zUuidLikeRequired,
  rfqId: zUuidLikeOptional,
  clientProjectManagers: zStringArray.optional(),
  pocOfConnectionDesigner: zStringArray.optional(),
  
  clientProjectManager: z.preprocess(
    emptyStringToUndefined,
    z.string().optional()
  ),
  status: z.enum(Status),
  stage: z.enum(Stage),
  tools: z.enum(Tools),

  CDQuataionID: zUuidLikeOptional,
  connectionDesignerID: zUuidLikeOptional,

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
  approvalDateChangeReason: z.string().optional(),
  fabricationDateChangeReason: z.string().optional(),

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

export type UpdateprojectInput = { id: string } & Partial<CreateProjectInput >;
export type GetProjectInput = { id: string };
export type DeleteProjectInput = { id: string };
