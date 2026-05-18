import { z } from "zod";

/**
 * Central environment variable validation.
 * All env vars used across the app should be validated and exported from here.
 * Fails fast at startup if any required env var is missing or invalid.
 */
const envSchema = z.object({
  DEFAULT_PASSWORD: z
    .string()
    .min(12, "DEFAULT_PASSWORD must be at least 12 characters")
    .regex(/[a-z]/, "DEFAULT_PASSWORD must include a lowercase letter")
    .regex(/[A-Z]/, "DEFAULT_PASSWORD must include an uppercase letter")
    .regex(/\d/, "DEFAULT_PASSWORD must include a number")
    .regex(/[^A-Za-z0-9]/, "DEFAULT_PASSWORD must include a special character"),
});

export const env = envSchema.parse(process.env);
