import { transporter } from "./transporter";

type SendEmailInput = {
  to: string | string[];  // can be a single email or list of recipients
  subject: string;        // subject line of the email
  text?: string;          // optional plain text version
  html?: string;          // optional HTML version
};

const sendEmail = async ({ to, subject, text, html }: SendEmailInput) => {
  try {
    const info = await transporter.sendMail({
      from: "wbt.itdev@gmail.com",
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export { sendEmail };
