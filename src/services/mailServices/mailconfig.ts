import { transporter } from "./transporter";
import prisma from "../../config/database/client";

type SendEmailInput = {
  to: string | string[];  // can be a single email or list of recipients
  cc?: string | string[]; // optional CC recipients
  subject: string;        // subject line of the email
  text?: string;          // optional plain text version
  html?: string;          // optional HTML version
};

const getCCEmails = async (): Promise<string[]> => {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ['ADMIN', 'DEPUTY_MANAGER', 'OPERATION_EXECUTIVE']
      },
      isActive: true,
      email: {
        not: null
      }
    },
    select: {
      email: true
    }
  });
  return users.map(user => user.email!).filter(email => email);
};

const sendEmail = async ({ to, cc, subject, text, html }: SendEmailInput) => {
  try {
    const info = await transporter.sendMail({
      from: "wbt.itdev@gmail.com",
      to,
      cc,
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

export { sendEmail, getCCEmails };
