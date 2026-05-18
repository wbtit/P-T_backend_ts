import crypto from 'crypto';

export function generateOtp(): { otp: string; otpHash: string; otpSalt: string } {
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpSalt = crypto.randomBytes(16).toString('hex');
  const otpHash = crypto.createHmac('sha256', otpSalt).update(otp).digest('hex');
  return { otp, otpHash, otpSalt };
}

export function verifyOtp(otp: string, otpHash: string, otpSalt: string): boolean {
  const hash = crypto.createHmac('sha256', otpSalt).update(otp).digest('hex');
  return hash === otpHash;
}
