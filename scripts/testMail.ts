import "dotenv/config";
import { mailService } from "../src/services/mail/MailService";

async function testMail() {
  const mailSender = process.env.MAIL_SENDER;

  if (!mailSender) {
    console.error("MAIL_SENDER is not defined in environment variables.");
    process.exit(1);
  }

  try {
    console.log(`Sending test email to ${mailSender}...`);
    await mailService.sendMail({
      to: mailSender,
      subject: "Graph API Migration Test",
      html: "<h1>Migration successful</h1><p>Microsoft Graph API is live.</p>",
    });
    console.log("Test email sent successfully.");
  } catch (error) {
    console.error("Failed to send test email:", error);
    process.exit(1);
  }
}

testMail();
