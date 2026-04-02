import { UserRole } from "@prisma/client";

type NotificationPayload = {
  type: string;
  title: string;
  message: string;
  [key: string]: any;
};

type RoleScopedMessageTemplates = {
  creator: { title: string; message: string };
  external: { title: string; message: string };
  oversight: { title: string; message: string };
  internal: { title: string; message: string };
  default?: { title: string; message: string };
};

type RoleScopedPayloadOptions = {
  type: string;
  basePayload?: Record<string, any>;
  templates: RoleScopedMessageTemplates;
};

const EXTERNAL_PROJECT_ROLES = new Set<UserRole>([
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "CLIENT_GENERAL_CONSTRUCTOR",
  "VENDOR",
  "VENDOR_ADMIN",
]);

const OVERSIGHT_PROJECT_ROLES = new Set<UserRole>([
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "ESTIMATION_HEAD",
  "HUMAN_RESOURCE",
  "SALES_MANAGER",
  "SALES_PERSON",
]);

const INTERNAL_PROJECT_ROLES = new Set<UserRole>([
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "CONNECTION_DESIGNER_ENGINEER",
  "STAFF",
  "ESTIMATOR",
]);

export function buildCreatorNotification(
  type: string,
  template: { title: string; message: string },
  basePayload: Record<string, any> = {}
): NotificationPayload {
  return {
    type,
    title: template.title,
    message: template.message,
    ...basePayload,
  };
}

export function buildRoleScopedNotification(
  role: UserRole,
  options: RoleScopedPayloadOptions
): NotificationPayload {
  const { type, basePayload = {}, templates } = options;

  let template = templates.default ?? templates.internal;

  if (EXTERNAL_PROJECT_ROLES.has(role)) {
    template = templates.external;
  } else if (OVERSIGHT_PROJECT_ROLES.has(role)) {
    template = templates.oversight;
  } else if (INTERNAL_PROJECT_ROLES.has(role)) {
    template = templates.internal;
  }

  return {
    type,
    title: template.title,
    message: template.message,
    ...basePayload,
  };
}
