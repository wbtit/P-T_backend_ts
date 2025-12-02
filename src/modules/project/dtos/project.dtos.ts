import z from "zod"
import {Status,Stage,Tools, Prisma} from "@prisma/client"


const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform(val => val === true || val === "true").optional();


export const CreateProjectSchema = z.object({
  projectNumber:z.string().min(1),
  name:z.string().min(1),
  description:z.string().min(1),
  fabricatorID:z.string().min(1),
  departmentID:z.string().min(1),
  teamID:z.string().min(1).optional(),
  managerID:z.string().min(1),
  rfqId:z.string().min(1).optional(),
  status:z.enum(Status),
  stage:z.enum(Stage),
  tools:z.enum(Tools),
  CDQuataionID:z.string().min(1).optional(),
  connectionDesignerID:z.string().min(1).optional(),
  files: z
        .union([
          z.array(z.any()),
          z.literal(null),
        ])
        .transform((val) => (val === null ? Prisma.JsonNull : val))
        .optional(),
  connectionDesign:zBooleanString,
  miscDesign:zBooleanString,
  customerDesign:zBooleanString,
  detailingMain:zBooleanString,
  detailingMisc:zBooleanString,
  startdate:z.date().min(new Date()),
  endDate:z.date().min(new Date()),
  endDateChangeLog:z.array(z.string()).optional(),
  approvalDate:z.date(),
  fabricationDate:z.date(),
  estimatedHours:z.float32(),
  detailCheckingHours:z.float32(),
  detailingHours:z.float32(),
  executionCheckingHours:z.float32(),
  executionHours:z.float32(),
  modelCheckingHours:z.float32(),
  modelingHours:z.float32(),
  mailReminder:zBooleanString,
  submissionMailReminder:zBooleanString
});
export const UpdateProjectSchema = CreateProjectSchema.partial()

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateprojectInput={id:string} & Partial<CreateProjectInput>;
export type GetProjectInput={id:string};
export type DeleteProjectInput={id:string};


