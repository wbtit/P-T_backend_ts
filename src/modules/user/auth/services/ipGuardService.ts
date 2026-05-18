import prisma from '../../../../config/database/client';
import { getGeoFromIp } from '../../../../services/geoService';
import { getFingerprintFromUA, getChallengeContext } from '../../../../services/deviceFingerprintService';
import { generateOtp } from '../../../../services/otpService';
import { generateChallengeToken } from '../../../../services/challengeTokenService';
import { sendChallengeEmail } from '../../../../services/mailServices/challengeMail';
import crypto from 'crypto';

export async function runIpGuard(params: {
  userId: string;
  ip: string;
  userAgent: string;
  userEmail: string;
  userName: string;
}): Promise<
  | { status: 'ALLOWED' }
  | { status: 'CHALLENGED'; challengeToken: string; message: string }
> {
  // 1. Check env SKIP_IP_CHALLENGE=true
  if (process.env.SKIP_IP_CHALLENGE === 'true') {
    return { status: 'ALLOWED' };
  }

  // 2. Get geo from geoService
  const geo = getGeoFromIp(params.ip);

  // 3. Get deviceFingerprint from deviceFingerprintService
  const currentFingerprint = getFingerprintFromUA(params.userAgent);

  // 4. Query UserTrustedIp for this userId where isActive=true and expiresAt > now()
  const now = new Date();
  const trustedIps = await prisma.userTrustedIp.findMany({
    where: {
      userId: params.userId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    }
  });

  // 5. Check if currentIp + currentFingerprint match any trusted record
  const isTrusted = trustedIps.some(
    (tip) => tip.ipAddress === params.ip && tip.deviceFingerprint === currentFingerprint
  );

  if (isTrusted) {
    // 6. If trusted → update lastUsedAt → log LoginAttempt as ALLOWED → upsert UserSession → return ALLOWED
    await prisma.userTrustedIp.update({
      where: {
        userId_ipAddress: {
          userId: params.userId,
          ipAddress: params.ip
        }
      },
      data: { lastUsedAt: now }
    });

    await prisma.loginAttempt.create({
      data: {
        userId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        deviceFingerprint: currentFingerprint,
        country: geo?.country,
        city: geo?.city,
        status: 'ALLOWED'
      }
    });

    const sessionData = {
      ipAddress: params.ip,
      country: geo?.country,
      city: geo?.city,
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      userAgent: params.userAgent,
      deviceFingerprint: currentFingerprint,
      lastSeenAt: now
    };

    const existingSession = await prisma.userSession.findFirst({
      where: { userId: params.userId, deviceFingerprint: currentFingerprint }
    });

    if (existingSession) {
      await prisma.userSession.update({
        where: { id: existingSession.id },
        data: sessionData
      });
    } else {
      await prisma.userSession.create({
        data: {
          ...sessionData,
          userId: params.userId
        }
      });
    }

    return { status: 'ALLOWED' };
  }

  // 7. If not trusted:
  // a. Determine challengeContext
  const knownFingerprints = trustedIps.map(tip => tip.deviceFingerprint).filter((f): f is string => !!f);
  const knownIps = trustedIps.map(tip => tip.ipAddress);
  const challengeContext = getChallengeContext({
    knownFingerprints,
    currentFingerprint,
    knownIps,
    currentIp: params.ip
  });

  // b. Generate OTP
  const { otp, otpHash, otpSalt } = generateOtp();

  // f. Create LoginAttempt record with status CHALLENGED
  const loginAttempt = await prisma.loginAttempt.create({
    data: {
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      deviceFingerprint: currentFingerprint,
      country: geo?.country,
      city: geo?.city,
      status: 'CHALLENGED'
    }
  });

  // c. Generate challengeToken
  const challengeToken = generateChallengeToken(params.userId, loginAttempt.id);

  // d. Hash the challengeToken
  const tokenHash = crypto.createHash('sha256').update(challengeToken).digest('hex');

  // e. Create IpChallenge record
  await prisma.ipChallenge.create({
    data: {
      userId: params.userId,
      ipAddress: params.ip,
      tokenHash,
      otpHash,
      otpSalt,
      challengeContext,
      loginAttemptId: loginAttempt.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    }
  });

  // g. Send challenge email
  await sendChallengeEmail({
    toEmail: params.userEmail,
    userName: params.userName,
    otp,
    ip: params.ip,
    city: geo?.city || null,
    country: geo?.country || null,
    challengeContext,
    userAgent: params.userAgent,
    timestamp: now
  });

  return {
    status: 'CHALLENGED',
    challengeToken,
    message: 'Verification required. Check your email.'
  };
}
