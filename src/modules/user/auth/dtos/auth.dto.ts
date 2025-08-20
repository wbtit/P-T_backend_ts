// auth/dto.ts
import { z } from "zod";
export type userRole='STAFF'|
          'CLIENT'|
          'VENDOR'|
          'ADMIN'|
          'SALES_MANAGER'|
          'SALES_PERSON'|
          'DEPT_MANAGER'|
          'ESTIMATION_HEAD'|
          'ESTIMATOR'|
          'PROJECT_MANAGER'|
          'TEAM_LEAD'|
          'PROJECT_MANAGER_OFFICER'|
          'DEPUTY_MANAGER'|
          'OPERATION_EXECUTIVE'|
          'HUMAN_RESOURCE'

export const signupSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
  email: z.string().nullable().optional(),
  firstName:z.string(),
  middleName:z.string().nullable().optional(),
  lastName:z.string().nullable().optional(),
  phone:z.string(),
  landline:z.string().nullable().optional(),
  altLandline:z.string().nullable().optional(),
  altPhone:z.string().nullable().optional(),
  designation:z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  role: z.string(),
  departmentId: z.string().nullable().optional()
});

export const signinSchema = z.object({
  username: z.string().email(),
  password: z.string(),
});

export const resetPasswordSchema = z.object({
  id: z.string(),
  token: z.string(),
  newPassword: z.string().min(6),
});

// Export TS types
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
