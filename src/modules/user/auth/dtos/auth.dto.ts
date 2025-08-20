import z from "zod";
import { createUserSchema } from "../../dtos"; 

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
export type SignupInput = z.infer<typeof createUserSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
