import { Prisma } from "@prisma/client";
import z from "zod";




export const VendorSchema = z.object({
  name: z.string().default(""),
  state: z.array(z.string()).optional(),
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
export const updateVendorSchema = VendorSchema.partial();

export type CreateVendorInput = z.infer<typeof VendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type GetVendorInput = { id: string };
export type DeleteVendorInput = { id: string };