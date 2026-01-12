import { Prisma } from "@prisma/client";
import z from "zod";




export const ConnectionDesignerSchema = z.object({
  name: z.string().default(""),
  state: z.string().optional(),
  contactInfo: z.string().nullable().optional(),
  websiteLink: z.string().nullable().optional(),
  email: z.string().optional(),
  location: z.string().nullable().optional(),
  files: z
        .union([
          z.array(z.any()),
          z.literal(null),
        ])
        .transform((val) => (val === null ? Prisma.JsonNull : val))
        .optional(),
  certificates: z
        .union([
          z.array(z.any()),
          z.literal(null),
        ])
        .transform((val) => (val === null ? Prisma.JsonNull : val))
        .optional(),
  insurenceLiability:z.string().optional(),      
  createdById: z.string().optional(),
});
export const updateConnectionDesignerSchema = ConnectionDesignerSchema.partial();

export type CreateConnectionDesignerInput = z.infer<typeof ConnectionDesignerSchema>;
export type UpdateConnectionDesignerInput = z.infer<typeof updateConnectionDesignerSchema>;
export type GetConnectionDesignerInput = { id: string };
export type DeleteConnectionDesignerInput = { id: string };