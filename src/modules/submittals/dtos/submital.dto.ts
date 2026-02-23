import { z } from "zod";
import { Stage, SubResStatus, State, Prisma } from "@prisma/client";

// ---------- HELPERS ----------
const zBooleanString = z
  .union([z.boolean(), z.string()])
  .transform(val => val === true || val === "true");

const zTrimmedNativeEnum = <T extends Record<string, string>>(values: T) =>
  z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.nativeEnum(values)
  );

// ---------- SUBMITTALS (PARENT / IDENTITY) ----------
export const createSubmittalsDto = z.object({
  fabricator_id: z.string().uuid(),
  mileStoneId: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  recepient_id: z.string().uuid(),
  sender_id: z.string().uuid(),

  stage: z.enum(Stage).optional(),
  subject: z.string(),
  description: z.string(),

  status: zBooleanString.optional(),
  isAproovedByAdmin: zBooleanString.optional(),
});

export const updateSubmittalsDto =
  createSubmittalsDto.partial();

export type CreateSubmittalsDto =
  z.infer<typeof createSubmittalsDto>;
export type UpdateSubmittalsDto =
  z.infer<typeof updateSubmittalsDto>;


// ---------- SUBMITTAL VERSION (CONTENT / FILES) ----------
export const createSubmittalVersionDto = z.object({
  submittalId: z.string().uuid(),

  description: z.string(),

  files: z
    .union([
      z.array(z.any()),
      z.literal(null),
    ])
    .transform(val =>
      val === null ? Prisma.JsonNull : val
    )
    .optional(),
});

export const updateSubmittalVersionDto =
  createSubmittalVersionDto.partial();

export type CreateSubmittalVersionDto =
  z.infer<typeof createSubmittalVersionDto>;
export type UpdateSubmittalVersionDto =
  z.infer<typeof updateSubmittalVersionDto>;


// ---------- SUBMITTALS RESPONSE ----------
export const createSubmittalsResponseDto = z.object({
  submittalsId: z.string().uuid(),
  submittalVersionId: z.string().uuid().optional(),

  description: z.string().optional(),
  reason: z.string().optional(),

  files: z
    .union([
      z.array(z.any()),
      z.literal(null),
    ])
    .transform(val =>
      val === null ? Prisma.JsonNull : val
    )
    .optional(),

  status: zTrimmedNativeEnum(SubResStatus).optional(),
  wbtStatus: zTrimmedNativeEnum(State).optional(),

  parentResponseId: z.string().uuid().optional(),
});

export const updateSubmittalsResponseDto =
  createSubmittalsResponseDto.partial();

export type CreateSubmittalsResponseDto =
  z.infer<typeof createSubmittalsResponseDto>;
export type UpdateSubmittalsResponseDto =
  z.infer<typeof updateSubmittalsResponseDto>;
