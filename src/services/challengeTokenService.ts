import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/utils/jwtutils';

export function generateChallengeToken(userId: string, challengeId: string): string {
  return jwt.sign({ userId, challengeId, type: 'CHALLENGE' }, JWT_SECRET, { expiresIn: '15m' });
}

export function verifyChallengeToken(token: string): { userId: string; challengeId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; challengeId: string; type: string };
    if (payload.type !== 'CHALLENGE') return null;
    return { userId: payload.userId, challengeId: payload.challengeId };
  } catch (err) {
    return null;
  }
}
