import z from "zod";
import { UserRole } from "@prisma/client";

export const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const createUserSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
  email: z.string().nullable().optional(),
  firstName:z.string(),
  middleName:z.string().nullable().optional(),
  lastName:z.string().nullable().optional(),
  phone:z.string(),
  extension:z.string().nullable().optional(),
  landline:z.string().nullable().optional(),
  altLandline:z.string().nullable().optional(),
  altPhone:z.string().nullable().optional(),
  designation:z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  role: z.enum(UserRole),
  departmentId: z.string().nullable().optional(),
  fabricatorId:z.string().optional(),
  connectionDesignerId:z.string().optional()
})

export const publicSignupSchema = createUserSchema
  .omit({
    role: true,
    departmentId: true,
    fabricatorId: true,
    connectionDesignerId: true,
  })
  .extend({
    password: z.string().min(6),
  });

export const resetPasswordSchema = z.object({
  id: z.string(),
  token: z.string(),
  newPassword: z.string().min(6),
});


// Export TS types
export type SignupInput = z.infer<typeof publicSignupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
