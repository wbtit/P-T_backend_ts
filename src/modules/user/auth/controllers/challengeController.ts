import { Request, Response } from 'express';
import prisma from '../../../../config/database/client';
import { verifyOtp } from '../../../../services/otpService';
import { verifyChallengeToken } from '../../../../services/challengeTokenService';
import { generateToken } from '../../../../config/utils/jwtutils';
import { getGeoFromIp } from '../../../../services/geoService';
import { getFingerprintFromUA } from '../../../../services/deviceFingerprintService';
import { UserJwt } from '../../../../shared/types';

const toJwtPayload = (user: any): UserJwt => ({
    id: user.id,
    email: user.email,
    username: user.username,
    connectionDesignerId: user.connectionDesignerId ?? null,
    departmentId: user.departmentId ?? null,
    role: user.role,
});

const sanitizeUser = (user: any) => {
    const { password, ...safeUser } = user;
    return safeUser;
};

export async function verifyChallenge(req: Request, res: Response) {
  try {
    const { otp, challengeToken } = req.body;

    if (!otp || !challengeToken) {
      return res.status(400).json({ success: false, message: 'OTP and challengeToken are required' });
    }

    const decoded = verifyChallengeToken(challengeToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }

    const { userId, challengeId } = decoded;

    const challenge = await prisma.ipChallenge.findFirst({
      where: {
        id: challengeId,
        userId,
        action: 'PENDING',
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!challenge) {
      return res.status(401).json({ success: false, message: 'Challenge expired or already used' });
    }

    const isValidOtp = verifyOtp(otp, challenge.otpHash, challenge.otpSalt);
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const currentFingerprint = getFingerprintFromUA(userAgent);
    const ip = req.ip || req.socket.remoteAddress || '';
    const geo = getGeoFromIp(ip);

    const result = await prisma.$transaction(async (tx) => {
      await tx.ipChallenge.update({
        where: { id: challengeId },
        data: { usedAt: new Date(), action: 'APPROVED' }
      });

      await tx.userTrustedIp.upsert({
        where: { userId_ipAddress: { userId, ipAddress: ip } },
        update: {
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          userAgent,
          deviceFingerprint: currentFingerprint
        },
        create: {
          userId,
          ipAddress: ip,
          country: geo?.country,
          city: geo?.city,
          userAgent,
          deviceFingerprint: currentFingerprint,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      });

      if (challenge.loginAttemptId) {
        await tx.loginAttempt.update({
          where: { id: challenge.loginAttemptId },
          data: { status: 'ALLOWED' }
        });
      }

      const sessionData = {
        ipAddress: ip,
        country: geo?.country,
        city: geo?.city,
        latitude: geo?.latitude,
        longitude: geo?.longitude,
        userAgent,
        deviceFingerprint: currentFingerprint,
        lastSeenAt: new Date()
      };

      const existingSession = await tx.userSession.findFirst({
        where: { userId, deviceFingerprint: currentFingerprint }
      });

      if (existingSession) {
        await tx.userSession.update({
          where: { id: existingSession.id },
          data: sessionData
        });
      } else {
        await tx.userSession.create({
          data: { ...sessionData, userId }
        });
      }

      return tx.user.findUnique({ where: { id: userId } });
    });

    if (!result) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const token = generateToken(toJwtPayload(result));
    return res.status(200).json({ 
        success: true, 
        token, 
        user: sanitizeUser(result),
        message: 'Login verified successfully' 
    });

  } catch (error) {
    console.error('Verify Challenge Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
