import { sendEmail } from "./mailconfig";
import { ChallengeContext } from "../deviceFingerprintService";

export interface SendChallengeEmailInput {
  email: string;
  username: string;
  otp: string;
  ipAddress: string;
  city?: string | null;
  country?: string | null;
  context: ChallengeContext;
}

export async function sendChallengeEmail({
  email,
  username,
  otp,
  ipAddress,
  city,
  country,
  context,
}: SendChallengeEmailInput): Promise<boolean> {
  let subject = "Your sign-in code";
  if (context === "NEW_NETWORK") {
    subject = "Your sign-in code (new network detected)";
  } else if (context === "NEW_DEVICE") {
    subject = "Your sign-in code (new device detected)";
  } else if (context === "NEW_BOTH") {
    subject = "Your sign-in code (new device and network detected)";
  }

  const locationStr = [city, country].filter(Boolean).join(", ") || "Unknown Location";
  const timestamp = new Date().toLocaleString();

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>Hello,</p>
      <p>We received a request to sign in to your account. Please use the following code to complete your sign-in:</p>
      
      <p style="font-size: 28px; font-weight: bold; margin: 24px 0; color: #0058a3;">${otp}</p>
      
      <p>This code will expire in 10 minutes.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
      
      <p><strong>Sign-in Details:</strong></p>
      <ul style="list-style-type: none; padding-left: 0; line-height: 1.6;">
        <li><strong>Username:</strong> ${username}</li>
        <li><strong>IP Address:</strong> ${ipAddress}</li>
        <li><strong>Location:</strong> ${locationStr}</li>
        <li><strong>Time:</strong> ${timestamp}</li>
      </ul>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
      
      <p style="font-size: 13px; color: #666; line-height: 1.5;">
        If you didn't request this code, you can safely ignore this email. Someone else might have entered your email address by mistake. Your account remains secure.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send challenge email:", error);
    return false;
  }
}
