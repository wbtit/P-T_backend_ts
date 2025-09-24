import { z } from "zod";

// ---------- ENUMS ----------
import { Stage,SubResStatus,State, Prisma } from "@prisma/client";

// ---------- SUBMITTALS DTO ----------
export const createSubmittalsDto = z.object({
  fabricator_id: z.string(),
  mileStoneId: z.string().optional(),
  project_id: z.string(),
  recepient_id: z.string(),
  sender_id: z.string(),
  status: z.boolean().optional(),
  stage: z.enum(Stage),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
  files: z
            .union([
              z.array(z.any()),
              z.literal(null),
            ])
            .transform((val) => (val === null ? Prisma.JsonNull : val))
            .optional(),
  isAproovedByAdmin: z.boolean().optional(),
});

export const updateSubmittalsDto = createSubmittalsDto.partial();

export type createSubDto=z.infer<typeof createSubmittalsDto>
export type updateSubDto=z.infer<typeof updateSubmittalsDto>


// ---------- SUBMITTALS RESPONSE DTO ----------
export const createSubmittalsResponseDto = z.object({
  files: z
            .union([
              z.array(z.any()),
              z.literal(null),
            ])
            .transform((val) => (val === null ? Prisma.JsonNull : val))
            .optional(),
  reason: z.string().optional(),
  submittalsId: z.string(),
  description: z.string().optional(),
  status: z.enum(SubResStatus),
  wbtStatus: z.enum(State),
  parentResponseId: z.string().optional(),
});

export const updateSubmittalsResponseDto = createSubmittalsResponseDto.partial();

export type createSubResDto=z.infer<typeof createSubmittalsResponseDto>
export type updateSubResDto=z.infer<typeof updateSubmittalsResponseDto>