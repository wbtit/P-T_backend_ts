import z from "zod";
import { COSTATUS,Stage} from "@prisma/client";
import { Prisma } from "@prisma/client";
const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform(val => val === true || val === "true");

export const CreateCoSchema = z.object({
  project: z.string(),
  sender: z.string(),
  recipients: z.string(),
    remarks: z.string().min(2).max(100),
    changeOrderNumber: z.string().min(2).max(100),
    description: z.string().min(2).max(500),
    sentOn: z
      .preprocess(
        (val) => (typeof val === "string" ? new Date(val) : val),
        z.date().nullable().optional()
      ),
    stage: z.enum(Stage).default("IFA"),
    status: z.enum(COSTATUS).default("NOT_REPLIED"),   // 👈 use the Prisma enum here
    reason: z.string().optional(),
    isAproovedByAdmin: zBooleanString,
    files: z
        .union([
          z.array(z.any()),
          z.literal(null),
        ])
        .transform((val) => (val === null ? Prisma.JsonNull : val))
        .optional(),
    link: z.string().nullable().optional(),
});
export const UpdateCoSchema = CreateCoSchema.partial();

export type CreateCoInput = z.infer<typeof CreateCoSchema>;
export type UpdateCoInput = z.infer<typeof UpdateCoSchema>;

export const CreateTableSchema = z.object({
    description: z.string().min(2).max(500),
    referenceDoc: z.string().min(2).max(100),
    elements: z.string().min(2).max(100),
    QtyNo: z.number().min(1),
    remarks: z.string().min(2).max(100),
    hours: z.number().min(1),
    cost: z.number().min(1),
    CoId: z.string(),
})

// 👇 Accepts multiple table entries
export const CreateCOTableSchema = z.array(CreateTableSchema);


export type CreateCOTableInput = z.infer<typeof CreateCOTableSchema>;
export type CotableRowInput = z.infer<typeof CreateTableSchema>;
