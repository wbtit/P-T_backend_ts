import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { ChallengeContext } from '@prisma/client';

export function getFingerprintFromUA(userAgent: string): string {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const fingerprintString = `${result.browser.name}-${result.os.name}-${result.device.type || 'desktop'}`;
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

export function getChallengeContext(params: {
  knownFingerprints: string[];
  currentFingerprint: string;
  knownIps: string[];
  currentIp: string;
}): ChallengeContext {
  const isFingerprintKnown = params.knownFingerprints.includes(params.currentFingerprint);
  const isIpKnown = params.knownIps.includes(params.currentIp);

  if (!isFingerprintKnown && !isIpKnown) {
    return 'NEW_DEVICE';
  }
  
  if (isFingerprintKnown && !isIpKnown) {
    return 'NEW_NETWORK';
  }

  return 'NEW_BOTH';
}
