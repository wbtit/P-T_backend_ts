import { transporter } from "./transporter";
import prisma from "../../config/database/client";
import { UserRole } from "@prisma/client";

type SendEmailInput = {
  to: string | string[];  // can be a single email or list of recipients
  cc?: string | string[]; // optional CC recipients
  subject: string;        // subject line of the email
  text?: string;          // optional plain text version
  html?: string;          // optional HTML version
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toEmailList = (value?: string | string[]) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(",");
  return Array.from(
    new Set(
      raw
        .map((email) => email?.trim())
        .filter((email): email is string => Boolean(email))
        .map(normalizeEmail)
    )
  );
};

const filterInactiveUserEmails = async (emails: string[]): Promise<string[]> => {
  if (!emails.length) return [];

  const matchedUsers = await prisma.user.findMany({
    where: {
      email: { in: emails },
    },
    select: {
      email: true,
      isActive: true,
    },
  });

  const inactiveEmails = new Set(
    matchedUsers
      .filter((user) => user.email && !user.isActive)
      .map((user) => normalizeEmail(user.email!))
  );

  return emails.filter((email) => !inactiveEmails.has(email));
};

const sanitizeMailRecipients = async ({ to, cc }: Pick<SendEmailInput, "to" | "cc">) => {
  const sanitizedTo = await filterInactiveUserEmails(toEmailList(to));
  const sanitizedCc = (await filterInactiveUserEmails(toEmailList(cc))).filter(
    (email) => !sanitizedTo.includes(email)
  );

  return {
    to: sanitizedTo,
    cc: sanitizedCc,
  };
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

const getEmailsByRoles = async (roles: UserRole[]): Promise<string[]> => {
  if (!roles.length) return [];

  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      isActive: true,
      email: { not: null },
    },
    select: { email: true },
  });

  return Array.from(new Set(users.map((user) => user.email!).filter(Boolean)));
};

export const stripHtml = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

const sendEmail = async ({ to, cc, subject, text, html }: SendEmailInput) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Email sending disabled in development environment');
    return { messageId: 'development-mode' };
  }

  try {
    const sanitizedRecipients = await sanitizeMailRecipients({ to, cc });

    if (sanitizedRecipients.to.length === 0) {
      console.log("Email skipped because no active recipients remained after filtering");
      return { messageId: "skipped-no-active-recipients" };
    }

    const info = await transporter.sendMail({
      from: "wbt.itdev@gmail.com",
      to: sanitizedRecipients.to,
      cc: sanitizedRecipients.cc.length ? sanitizedRecipients.cc : undefined,
      subject: stripHtml(subject),
      text,
      html,
    });
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export { sendEmail, getCCEmails, getEmailsByRoles, sanitizeMailRecipients };
