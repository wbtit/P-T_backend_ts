import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../../../../config/database/client";
import { AppError } from "../../../../config/utils/AppError";
import { generateToken } from "../../../../config/utils/jwtutils";
import { getFingerprintFromUA } from "../../../../services/deviceFingerprintService";
import { getGeoLocation } from "../../../../services/geoService";
import { verifyOtp } from "../../../../services/otpService";

// Helper to verify challenge token hash in database
export const verifyChallengeToken = async (challengeToken: string) => {
  const tokenHash = crypto.createHash("sha256").update(challengeToken).digest("hex");
  const challenge = await prisma.ipChallenge.findUnique({
    where: { tokenHash },
  });
  if (!challenge) return null;
  return {
    userId: challenge.userId,
    challengeId: challenge.id,
  };
};

export const handleVerifyChallenge = async (req: Request, res: Response) => {
  const { otp, challengeToken } = req.body;

  // 1. Body validation: otp and challengeToken both required
  if (!otp || !challengeToken) {
    throw new AppError("OTP and challengeToken are required", 400);
  }

  // 2. verifyChallengeToken call → extract userId, challengeId
  const extracted = await verifyChallengeToken(challengeToken);
  
  // 3. 401 on invalid token
  if (!extracted) {
    throw new AppError("Invalid challenge token", 401);
  }

  const { userId, challengeId } = extracted;

  // 4. IpChallenge DB lookup
  const challenge = await prisma.ipChallenge.findFirst({
    where: {
      id: challengeId,
      userId,
      action: "PENDING",
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  // 5. 401 on not found or expired
  if (!challenge) {
    throw new AppError("Challenge has expired or is invalid", 401);
  }

  // 6. verifyOtp call
  const isOtpValid = verifyOtp(otp, challenge.otpHash, challenge.otpSalt);

  // 7. 400 on invalid OTP
  if (!isOtpValid) {
    throw new AppError("Invalid OTP code", 400);
  }

  const userAgent = req.headers["user-agent"] || "";
  const deviceFingerprint = getFingerprintFromUA(userAgent);
  const ipAddress = challenge.ipAddress;
  const geo = getGeoLocation(ipAddress);

  const country = geo ? geo.country : null;
  const city = geo ? geo.city : null;
  const latitude = geo ? geo.latitude : null;
  const longitude = geo ? geo.longitude : null;

  const now = new Date();

  // 8. prisma.$transaction containing all DB updates
  await prisma.$transaction(async (tx) => {
    // a. ipChallenge.update
    await tx.ipChallenge.update({
      where: { id: challengeId },
      data: {
        usedAt: now,
        action: "APPROVED",
      },
    });

    // b. userTrustedIp.upsert
    await tx.userTrustedIp.upsert({
      where: {
        userId_ipAddress_deviceFingerprint: {
          userId,
          ipAddress,
          deviceFingerprint,
        },
      },
      create: {
        userId,
        ipAddress,
        country,
        city,
        deviceFingerprint,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // now + 30 days
        isActive: true,
      },
      update: {
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        lastUsedAt: now,
      },
    });

    // c. loginAttempt.update (only if loginAttemptId exists)
    if (challenge.loginAttemptId) {
      await tx.loginAttempt.update({
        where: { id: challenge.loginAttemptId },
        data: { status: "ALLOWED" },
      });
    }

    // d. userSession upsert
    const existingSession = await tx.userSession.findFirst({
      where: {
        userId,
        userAgent,
      },
    });

    if (existingSession) {
      await tx.userSession.update({
        where: { id: existingSession.id },
        data: {
          ipAddress,
          country,
          city,
          latitude,
          longitude,
          lastSeenAt: now,
        },
      });
    } else {
      await tx.userSession.create({
        data: {
          userId,
          ipAddress,
          userAgent,
          country,
          city,
          latitude,
          longitude,
        },
      });
    }
  });

  // 9. Real JWT issued after transaction using existing jwtutils
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    username: user.username,
    connectionDesignerId: user.connectionDesignerId || null,
    departmentId: user.departmentId || null,
    role: user.role,
  };

  const token = generateToken(tokenPayload);

  // 10. 200 response with token and message
  res.status(200).json({
    success: true,
    data: {
      token,
      message: "Device verification successful. Login allowed.",
    },
  });
};
