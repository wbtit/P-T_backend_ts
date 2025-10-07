import z from "zod";
import { COSTATUS,Stage} from "@prisma/client";
import { Prisma } from "@prisma/client";

export const CreateCoSchema = z.object({
  project: z.string(),
  sender: z.string(),
  recipients: z.string(),
    remarks: z.string().min(2).max(100),
    changeOrderNumber: z.string().min(2).max(100),
    description: z.string().min(2).max(500),
    sentOn: z.date().optional(),
    stage: z.enum(Stage),
    status: z.enum(COSTATUS),   // 👈 use the Prisma enum here
    reason: z.string().optional(),
    isAproovedByAdmin: z.boolean().optional(),
    files: z
        .union([
          z.array(z.any()),
          z.literal(null),
        ])
        .transform((val) => (val === null ? Prisma.JsonNull : val))
        .optional(),
        link: z.string().nullable().optional(),
});

export const CreateCOTableSchema = z.object({
    description: z.string().min(2).max(500),
    referenceDoc: z.string().min(2).max(100),
    elements: z.string().min(2).max(100),
    QtyNo: z.number().min(1),
    remarks: z.string().min(2).max(100),
    hours: z.number().min(1),
    cost: z.number().min(1),
    CoId: z.string(),
})