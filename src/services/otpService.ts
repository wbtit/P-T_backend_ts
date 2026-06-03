import crypto from "crypto";

export interface GeneratedOtp {
  otp: string;
  otpHash: string;
  otpSalt: string;
}

/**
 * Generates a 6-digit numeric OTP, along with a random salt and its SHA256 hash.
 */
export const generateOtp = (): GeneratedOtp => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpSalt = crypto.randomBytes(16).toString("hex");
  const otpHash = crypto.createHash("sha256").update(otp + otpSalt).digest("hex");
  return { otp, otpHash, otpSalt };
};

/**
 * Verifies if the user-provided OTP matches the stored hash and salt.
 */
export const verifyOtp = (otp: string, storedHash: string, storedSalt: string): boolean => {
  const hash = crypto.createHash("sha256").update(otp + storedSalt).digest("hex");
  return hash === storedHash;
};
