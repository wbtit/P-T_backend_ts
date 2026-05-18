import { transporter } from './transporter';
import { ChallengeContext } from '@prisma/client';

export async function sendChallengeEmail(params: {
  toEmail: string;
  userName: string;
  otp: string;
  ip: string;
  city: string | null;
  country: string | null;
  challengeContext: ChallengeContext;
  userAgent: string | null;
  timestamp: Date;
}): Promise<void> {
  let subject = '';
  let contextMessage = '';

  switch (params.challengeContext) {
    case 'NEW_NETWORK':
      subject = 'Your account was accessed from a new network';
      contextMessage = 'We noticed a login from a new network.';
      break;
    case 'NEW_DEVICE':
      subject = 'New device login detected';
      contextMessage = 'A new device was used to log into your account.';
      break;
    case 'NEW_BOTH':
    default:
      subject = 'New device and new location detected';
      contextMessage = 'We detected a login from a new device and a new location.';
      break;
  }

  const location = `${params.city || 'Unknown City'}, ${params.country || 'Unknown Country'}`;
  
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2>${subject}</h2>
      <p>Hello ${params.userName},</p>
      <p>${contextMessage}</p>
      <p>Please use the following code to verify your login:</p>
      <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #f4f4f4; display: inline-block;">
        ${params.otp}
      </div>
      <p><strong>Login Details:</strong></p>
      <ul>
        <li><strong>IP Address:</strong> ${params.ip}</li>
        <li><strong>Location:</strong> ${location}</li>
        <li><strong>Time:</strong> ${params.timestamp.toUTCString()}</li>
        <li><strong>User Agent:</strong> ${params.userAgent || 'Unknown'}</li>
      </ul>
      <p>This code will expire in 10 minutes.</p>
      <p>If this wasn't you, your account is safe — this login requires verification. We recommend changing your password if you're concerned.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: params.toEmail,
    subject,
    html,
  });
}
