import { UAParser } from "ua-parser-js";
import crypto from "crypto";

export const getFingerprintFromUA = (userAgent: string | undefined): string => {
  const ua = userAgent || "";
  const parser = new UAParser(ua);
  const result = parser.getResult();

  const browserName = result.browser.name || "unknown-browser";
  const osName = result.os.name || "unknown-os";
  const deviceType = result.device.type || "unknown-device-type";

  // Correct string interpolation
  const rawFingerprint = `${browserName}|${osName}|${deviceType}`;
  return crypto.createHash("sha256").update(rawFingerprint).digest("hex");
};

export type ChallengeContext = "NEW_NETWORK" | "NEW_DEVICE" | "NEW_BOTH";

export const getChallengeContext = (
  fingerprintKnown: boolean,
  ipKnown: boolean
): ChallengeContext => {
  if (fingerprintKnown && ipKnown) {
    return "NEW_BOTH";
  }
  if (fingerprintKnown && !ipKnown) {
    return "NEW_NETWORK";
  }
  if (!fingerprintKnown && !ipKnown) {
    return "NEW_BOTH";
  }
  if (!fingerprintKnown && ipKnown) {
    return "NEW_BOTH";
  }
  return "NEW_BOTH";
};
