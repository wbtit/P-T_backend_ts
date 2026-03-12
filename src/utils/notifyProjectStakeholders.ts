import { UserRole } from "@prisma/client";
import prisma from "../config/database/client";
import { notifyUsers } from "./notifyByRole";

export async function notifyProjectStakeholders(projectId: string, roles: UserRole[], payload: any): Promise<void> {
  if (!roles.length) return;

  const project = await prisma.project.findUnique({
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
      }
    }
  });

  if (!project) return;

  const recipientIds = new Set<string>();

  const globalRoles: UserRole[] = [
    "SYSTEM_ADMIN", "ADMIN", "DEPUTY_MANAGER", "PROJECT_MANAGER_OFFICER", 
    "ESTIMATION_HEAD", "OPERATION_EXECUTIVE", "HUMAN_RESOURCE", 
    "SALES_MANAGER", "SALES_PERSON"
  ];

  const rolesToFetchGlobally = roles.filter(r => globalRoles.includes(r));
  if (rolesToFetchGlobally.length > 0) {
    const globalUsers = await prisma.user.findMany({
      where: { role: { in: rolesToFetchGlobally }, isActive: true },
      select: { id: true }
    });
    globalUsers.forEach(u => recipientIds.add(u.id));
  }

  roles.forEach(role => {
    switch (role) {
      case "PROJECT_MANAGER":
        if (project.manager?.isActive) recipientIds.add(project.manager.id);
        break;
      case "DEPT_MANAGER":
        if (project.department?.managerIds) {
          project.department.managerIds.forEach(m => {
            if (m.isActive && m.role === "DEPT_MANAGER") recipientIds.add(m.id);
          });
        }
        break;
      case "TEAM_LEAD":
        if (project.team?.manager?.isActive && project.team.manager.role === "TEAM_LEAD") {
          recipientIds.add(project.team.manager.id);
        }
        if (project.team?.members) {
          project.team.members.forEach(tm => {
            if (tm.member?.isActive && tm.member.role === "TEAM_LEAD") {
              recipientIds.add(tm.member.id);
            }
          });
        }
        break;
      case "CONNECTION_DESIGNER_ENGINEER":
        if (project.connectionDesigner?.CDEngineers) {
          project.connectionDesigner.CDEngineers.forEach(c => {
            if (c.isActive && c.role === "CONNECTION_DESIGNER_ENGINEER") recipientIds.add(c.id);
          });
        }
        break;
      case "STAFF":
      case "ESTIMATOR":
        if (project.team?.members) {
           project.team.members.forEach(tm => {
             if (tm.member?.isActive && tm.member.role === role) recipientIds.add(tm.member.id);
           });
        }
        break;
      case "CLIENT":
      case "CLIENT_ADMIN":
      case "CLIENT_PROJECT_COORDINATOR":
      case "CLIENT_GENERAL_CONSTRUCTOR":
      case "VENDOR":
      case "VENDOR_ADMIN":
        if (project.fabricator) {
          project.fabricator.pointOfContact?.forEach(p => {
             if (p.isActive && p.role === role) recipientIds.add(p.id);
          });
          project.fabricator.wbtFabricatorPointOfContact?.forEach(p => {
             if (p.isActive && p.role === role) recipientIds.add(p.id);
          });
        }
        if (project.vendor) {
          project.vendor.pointOfContacts?.forEach(p => {
            if (p.isActive && p.role === role) recipientIds.add(p.id);
          });
        }
        break;
    }
  });

  await notifyUsers(Array.from(recipientIds), payload);
}
