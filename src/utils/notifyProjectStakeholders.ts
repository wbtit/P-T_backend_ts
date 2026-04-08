import { UserRole } from "@prisma/client";
import prisma from "../config/database/client";
import { notifyUsers } from "./notifyByRole";
import { sendNotification } from "./sendNotification";
import { enrichNotificationPayloadWithProject } from "./projectNotificationPayload";

type NotifyProjectStakeholdersOptions = {
  excludeUserIds?: string[];
};

type ProjectStakeholderProject = NonNullable<
  Awaited<ReturnType<typeof getProjectStakeholderContext>>
>;

type RolePayloadBuilder = (
  role: UserRole,
  params: {
    project: ProjectStakeholderProject;
    recipientIds: string[];
  }
) => any | null | undefined;

async function getProjectStakeholderContext(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      fabricator: {
        include: {
          pointOfContact: true,
          wbtFabricatorPointOfContact: true,
        }
      },
      team: {
        include: {
          manager: true,
          members: {
            include: { member: true }
          }
        }
      },
      department: {
        include: {
          managerIds: true,
        }
      },
      manager: true,
      vendor: {
        include: { pointOfContacts: true }
      },
      connectionDesigner: {
        include: { CDEngineers: true }
      },
      pocOfConnectionDesigner: true,
      clientProjectManagers: true,
      // Added: scope SALES_PERSON to the project's linked RFQ
      rfq: { include: { salesPerson: true } },
    }
  });
}

export async function getProjectStakeholderRecipients(
  projectId: string,
  roles: UserRole[]
): Promise<{
  project: ProjectStakeholderProject | null;
  recipientsByRole: Map<UserRole, string[]>;
}> {
  const project = await getProjectStakeholderContext(projectId);

  if (!project) {
    return { project: null, recipientsByRole: new Map() };
  }

  const recipientsByRole = new Map<UserRole, Set<string>>();
  const addRecipient = (role: UserRole, userId?: string | null) => {
    if (!userId) return;
    if (!recipientsByRole.has(role)) {
      recipientsByRole.set(role, new Set());
    }
    recipientsByRole.get(role)!.add(userId);
  };

  // Truly global roles — org-wide, not project-scoped
  const trulyGlobalRoles: UserRole[] = ["SYSTEM_ADMIN", "ADMIN"];
  const rolesToFetchGlobally = roles.filter((r) => trulyGlobalRoles.includes(r));

  if (rolesToFetchGlobally.length > 0) {
    const globalUsers = await prisma.user.findMany({
      where: { role: { in: rolesToFetchGlobally }, isActive: true },
      select: { id: true, role: true },
    });
    globalUsers.forEach((u) => addRecipient(u.role, u.id));
  }

  // DEPUTY_MANAGER is scoped to the project's department managers
  if (roles.includes("DEPUTY_MANAGER")) {
    project.department?.managerIds?.forEach((u) => {
      if (u.isActive && u.role === "DEPUTY_MANAGER") addRecipient("DEPUTY_MANAGER", u.id);
    });
  }

  // NOTE: PROJECT_MANAGER_OFFICER, OPERATION_EXECUTIVE, ESTIMATION_HEAD,
  // SALES_MANAGER, HUMAN_RESOURCE have no explicit project relation in the
  // current schema. They are intentionally NOT fetched globally to prevent
  // wrong-user notifications. Extend getProjectStakeholderContext() and
  // add cases below when schema relations are added for these roles.

  roles.forEach((role) => {
    switch (role) {
      case "PROJECT_MANAGER":
        if (project.manager?.isActive && project.manager.role === "PROJECT_MANAGER") {
          addRecipient(role, project.manager.id);
        }
        break;
      case "DEPT_MANAGER":
        if (project.department?.managerIds) {
          project.department.managerIds.forEach((m) => {
            if (m.isActive && m.role === "DEPT_MANAGER") addRecipient(role, m.id);
          });
        }
        break;
      case "TEAM_LEAD":
        if (project.team?.manager?.isActive && project.team.manager.role === "TEAM_LEAD") {
          addRecipient(role, project.team.manager.id);
        }
        if (project.team?.members) {
          project.team.members.forEach((tm) => {
            if (tm.member?.isActive && tm.member.role === "TEAM_LEAD") {
              addRecipient(role, tm.member.id);
            }
          });
        }
        break;
      case "CONNECTION_DESIGNER_ENGINEER":
        // Use project-specific CDE list, not all engineers in the company
        if (project.pocOfConnectionDesigner?.length) {
          project.pocOfConnectionDesigner.forEach((c) => {
            if (c.isActive && c.role === "CONNECTION_DESIGNER_ENGINEER") addRecipient(role, c.id);
          });
        } else if (project.connectionDesigner?.CDEngineers) {
          // Fallback: if no specific POC set, use company engineers
          project.connectionDesigner.CDEngineers.forEach((c) => {
            if (c.isActive && c.role === "CONNECTION_DESIGNER_ENGINEER") addRecipient(role, c.id);
          });
        }
        break;
      case "CONNECTION_DESIGNER_ADMIN":
        if (project.connectionDesigner?.CDEngineers) {
          project.connectionDesigner.CDEngineers.forEach((c) => {
            if (c.isActive && c.role === "CONNECTION_DESIGNER_ADMIN") addRecipient(role, c.id);
          });
        }
        break;
      case "SALES_PERSON":
        if (project.rfq?.salesPerson?.isActive) {
          addRecipient(role, project.rfq.salesPerson.id);
        }
        break;
      case "STAFF":
      case "ESTIMATOR":
        if (project.team?.members) {
          project.team.members.forEach((tm) => {
            if (tm.member?.isActive && tm.member.role === role) addRecipient(role, tm.member.id);
          });
        }
        break;
      case "CLIENT":
        if (project.clientProjectManagers?.length) {
          project.clientProjectManagers.forEach((pm) => {
            if (pm.isActive) addRecipient(role, pm.id);
          });
        }
        break;
      case "CLIENT_ADMIN":
      case "CLIENT_PROJECT_COORDINATOR":
      case "CLIENT_GENERAL_CONSTRUCTOR":
      case "VENDOR":
      case "VENDOR_ADMIN":
        if (project.fabricator) {
          project.fabricator.pointOfContact?.forEach((p) => {
            if (p.isActive && p.role === role) addRecipient(role, p.id);
          });
          project.fabricator.wbtFabricatorPointOfContact?.forEach((p) => {
            if (p.isActive && p.role === role) addRecipient(role, p.id);
          });
        }
        if (project.vendor) {
          project.vendor.pointOfContacts?.forEach((p) => {
            if (p.isActive && p.role === role) addRecipient(role, p.id);
          });
        }
        break;
    }
  });

  return {
    project,
    recipientsByRole: new Map(
      Array.from(recipientsByRole.entries()).map(([role, ids]) => [role, Array.from(ids)])
    ),
  };
}

export async function notifyProjectStakeholders(
  projectId: string,
  roles: UserRole[],
  payload: any,
  options: NotifyProjectStakeholdersOptions = {}
): Promise<void> {
  if (!roles.length) return;
  const { project, recipientsByRole } = await getProjectStakeholderRecipients(projectId, roles);

  if (!project) return;

  const enrichedPayload = await enrichNotificationPayloadWithProject({
    ...payload,
    projectId,
    projectName: project.name,
  });

  const excludedUserIds = new Set((options.excludeUserIds || []).filter(Boolean));
  const filteredRecipientIds = Array.from(recipientsByRole.values())
    .flat()
    .filter((id) => !excludedUserIds.has(id));

  await notifyUsers(filteredRecipientIds, enrichedPayload);
}

export async function notifyProjectStakeholdersByRole(
  projectId: string,
  roles: UserRole[],
  payloadBuilder: RolePayloadBuilder,
  options: NotifyProjectStakeholdersOptions = {}
): Promise<void> {
  if (!roles.length) return;

  const { project, recipientsByRole } = await getProjectStakeholderRecipients(projectId, roles);
  if (!project) return;

  const excludedUserIds = new Set((options.excludeUserIds || []).filter(Boolean));

  await Promise.all(
    Array.from(recipientsByRole.entries()).map(async ([role, recipientIds]) => {
      const filteredRecipientIds = recipientIds.filter((id) => !excludedUserIds.has(id));
      if (!filteredRecipientIds.length) return;

      const payload = payloadBuilder(role, { project, recipientIds: filteredRecipientIds });
      if (!payload) return;

      const enrichedPayload = await enrichNotificationPayloadWithProject({
        ...payload,
        projectId,
        projectName: project.name,
      });

      await Promise.all(
        filteredRecipientIds.map((userId) => sendNotification(userId, enrichedPayload))
      );
    })
  );
}
