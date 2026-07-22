import { mailService } from "../mail/MailService";
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

  // Track which emails have at least one active user
  const hasActiveUser = new Set(
    matchedUsers
      .filter((user) => user.email && user.isActive)
      .map((user) => normalizeEmail(user.email!))
  );

  // An email is considered inactive ONLY if it exists in the DB, but has NO active users
  const inactiveEmails = new Set(
    matchedUsers
      .filter((user) => user.email && !user.isActive && !hasActiveUser.has(normalizeEmail(user.email!)))
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

const getCCEmails = async (projectId?: string): Promise<string[]> => {
  // Global roles that should always be CC'd
  const globalRoles: UserRole[] = ['ADMIN', 'DEPUTY_MANAGER', 'OPERATION_EXECUTIVE', 'PROJECT_MANAGER_OFFICER'];
  
  const globalUsers = await prisma.user.findMany({
    where: {
      role: { in: globalRoles },
      isActive: true,
      email: { not: null },
    },
    select: { email: true }
  });
  
  let ccEmails = globalUsers.map(u => u.email!);

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        manager: { select: { email: true } },
        department: {
          include: {
            managerIds: { select: { email: true, isActive: true } }
          }
        }
      }
    });

    if (project) {
      if (project.manager?.email) {
        ccEmails.push(project.manager.email);
      }
      if (project.department?.managerIds) {
        for (const deptManager of project.department.managerIds) {
          if (deptManager.isActive && deptManager.email) {
            ccEmails.push(deptManager.email);
          }
        }
      }
    }
  }

  // Remove duplicates
  return Array.from(new Set(ccEmails));
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

    await mailService.sendMail({
      to: sanitizedRecipients.to,
      cc: sanitizedRecipients.cc.length ? sanitizedRecipients.cc : undefined,
      subject: stripHtml(subject),
      html: html || text || "",
    });
    return { messageId: "graph-api-sent" };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export { sendEmail, getCCEmails, getEmailsByRoles, sanitizeMailRecipients };
