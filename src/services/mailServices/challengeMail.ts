import { sendEmail } from "./mailconfig";
import { ChallengeContext } from "../deviceFingerprintService";

export interface SendChallengeEmailInput {
  email: string;
  otp: string;
  ipAddress: string;
  city?: string | null;
  country?: string | null;
  context: ChallengeContext;
}

export async function sendChallengeEmail({
  email,
  otp,
  ipAddress,
  city,
  country,
  context,
}: SendChallengeEmailInput): Promise<boolean> {
  let subject = "Security Alert: Verification Code Required";
  if (context === "NEW_NETWORK") {
    subject = "Verification Required: Login from a new network";
  } else if (context === "NEW_DEVICE") {
    subject = "Verification Required: Login from a new device";
  } else if (context === "NEW_BOTH") {
    subject = "Verification Required: New login location and device detected";
  }

  const locationStr = [city, country].filter(Boolean).join(", ") || "Unknown Location";
  const timestamp = new Date().toLocaleString();

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #333;">${subject}</h2>
      <p>A sign-in attempt was detected with your account details.</p>
      
      <div style="background-color: #f7f7f7; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff; display: block; text-align: center;">${otp}</span>
      </div>
      
      <p style="font-weight: bold;">OTP expires in 10 minutes.</p>
      
      <hr/>
      
      <h3>Login Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; color: #555;">IP Address:</td>
          <td style="padding: 5px 0; font-weight: bold;">${ipAddress}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #555;">Location:</td>
          <td style="padding: 5px 0; font-weight: bold;">${locationStr}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #555;">Time:</td>
          <td style="padding: 5px 0; font-weight: bold;">${timestamp}</td>
        </tr>
      </table>
      
      <hr/>
      
      <p style="font-size: 12px; color: #777; margin-top: 20px;">
        If this wasn't you, your account is safe. However, someone may know your password. We recommend changing your password immediately.
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
