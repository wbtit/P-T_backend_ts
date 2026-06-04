import prisma from "../../../../config/database/client";
import { getGeoLocation } from "../../../../services/geoService";
import { getFingerprintFromUA, getChallengeContext } from "../../../../services/deviceFingerprintService";
import { sendChallengeEmail } from "../../../../services/mailServices/challengeMail";
import { generateOtp } from "../../../../services/otpService";
import crypto from "crypto";

export interface IpGuardResult {
  status: "ALLOWED" | "CHALLENGED" | "BLOCKED";
  challengeToken?: string;
  message?: string;
}

export const runIpGuard = async (
  userId: string,
  ip: string,
  userAgent: string | undefined,
  userEmail: string,
  userName: string
): Promise<IpGuardResult> => {
  // 1. SKIP_IP_CHALLENGE env check at top
  if (process.env.SKIP_IP_CHALLENGE === "true") {
    return { status: "ALLOWED" };
  }

  // 2. geoService call
  const geo = getGeoLocation(ip);
  const country = geo ? geo.country : null;
  const city = geo ? geo.city : null;
  const latitude = geo ? geo.latitude : null;
  const longitude = geo ? geo.longitude : null;

  // 3. deviceFingerprintService call
  const deviceFingerprint = getFingerprintFromUA(userAgent);

  // 4. UserTrustedIp query (isActive=true AND expiresAt > now)
  const now = new Date();
  const trustedIps = await prisma.userTrustedIp.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: now,
      },
    },
  });

  // 5. Trust check: BOTH ip AND deviceFingerprint must match for ALLOWED
  const trustedRecord = trustedIps.find(
    (record) => record.ipAddress === ip && record.deviceFingerprint === deviceFingerprint
  );

  if (trustedRecord) {
    // a. lastUsedAt update on trusted record
    await prisma.userTrustedIp.update({
      where: { id: trustedRecord.id },
      data: { lastUsedAt: now },
    });

    // b. LoginAttempt creation with status ALLOWED on trusted path
    await prisma.loginAttempt.create({
      data: {
        userId,
        ip,
        userAgent,
        country,
        city,
        riskScore: 0,
        riskReasons: JSON.stringify(["Trusted IP and device fingerprint matched"]),
        status: "ALLOWED",
      },
    });

    // c. UserSession upsert on trusted path
    const existingSession = await prisma.userSession.findFirst({
      where: {
        userId,
        userAgent,
      },
    });

    if (existingSession) {
      await prisma.userSession.update({
        where: { id: existingSession.id },
        data: {
          ipAddress: ip,
          country,
          city,
          latitude,
          longitude,
          lastSeenAt: now,
        },
      });
    } else {
      await prisma.userSession.create({
        data: {
          userId,
          ipAddress: ip,
          userAgent,
          country,
          city,
          latitude,
          longitude,
        },
      });
    }

    return { status: "ALLOWED" };
  }

  // 6. Untrusted path: getChallengeContext call
  const fingerprintKnown = trustedIps.some((r) => r.deviceFingerprint === deviceFingerprint);
  const ipKnown = trustedIps.some((r) => r.ipAddress === ip);
  const challengeContext = getChallengeContext(fingerprintKnown, ipKnown);

  // 7. OTP generation via unified otpService
  const { otp, otpHash, otpSalt } = generateOtp();

  // 8. challengeToken generation
  const challengeToken = crypto.randomBytes(32).toString("hex");

  // 9. tokenHash = SHA256 of challengeToken stored in DB
  const tokenHash = crypto.createHash("sha256").update(challengeToken).digest("hex");

  // 10. LoginAttempt creation with status CHALLENGED
  const loginAttempt = await prisma.loginAttempt.create({
    data: {
      userId,
      ip,
      userAgent,
      country,
      city,
      riskScore: 50,
      riskReasons: JSON.stringify([`Untrusted network or device. Context: ${challengeContext}`]),
      status: "CHALLENGED",
    },
  });

  // 11. IpChallenge record creation
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // now + 10 minutes
  await prisma.ipChallenge.create({
    data: {
      userId,
      ipAddress: ip,
      tokenHash,
      otpHash,
      otpSalt,
      challengeContext,
      loginAttemptId: loginAttempt.id,
      expiresAt,
    },
  });

  // 12. sendChallengeEmail call
  await sendChallengeEmail({
    email: userEmail,
    username: userName,
    otp,
    ipAddress: ip,
    city,
    country,
    context: challengeContext,
  });

  // 13. Return shape
  return {
    status: "CHALLENGED",
    challengeToken,
    message: "A verification challenge has been sent to your registered email address.",
  };
};
