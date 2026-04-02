import { UserRole } from "@prisma/client";
import prisma from "../config/database/client";
import { notifyUsers } from "./notifyByRole";
import { sendNotification } from "./sendNotification";

type NotifyRfqStakeholdersOptions = {
  excludeUserIds?: string[];
};

type RfqRolePayloadBuilder = (
  role: UserRole,
  params: {
    rfq: NonNullable<Awaited<ReturnType<typeof getRfqStakeholderContext>>>;
    recipientIds: string[];
  }
) => any | null | undefined;

async function getRfqStakeholderContext(rfqId: string) {
  return prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: {
      fabricator: {
        include: {
          pointOfContact: true,
          wbtFabricatorPointOfContact: true,
        }
      },
      vendorRFQ: {
        include: { pointOfContacts: true }
      },
      connectionDesignerRFQ: {
        include: { CDEngineers: true }
      }
    }
  });
}

export async function getRfqStakeholderRecipients(
  rfqId: string,
  roles: UserRole[]
): Promise<{
  rfq: NonNullable<Awaited<ReturnType<typeof getRfqStakeholderContext>>> | null;
  recipientsByRole: Map<UserRole, string[]>;
}> {
  const rfq = await getRfqStakeholderContext(rfqId);

  if (!rfq) {
    return { rfq: null, recipientsByRole: new Map() };
  }

  const recipientsByRole = new Map<UserRole, Set<string>>();
  const addRecipient = (role: UserRole, userId?: string | null) => {
    if (!userId) return;
    if (!recipientsByRole.has(role)) {
      recipientsByRole.set(role, new Set());
    }
    recipientsByRole.get(role)!.add(userId);
  };

  const globalRoles: UserRole[] = [
    "SYSTEM_ADMIN", "ADMIN", "DEPUTY_MANAGER", "PROJECT_MANAGER_OFFICER",
    "ESTIMATION_HEAD", "OPERATION_EXECUTIVE", "HUMAN_RESOURCE",
    "SALES_MANAGER", "SALES_PERSON"
  ];

  const rolesToFetchGlobally = roles.filter((r) => globalRoles.includes(r));
  if (rolesToFetchGlobally.length > 0) {
    const globalUsers = await prisma.user.findMany({
      where: { role: { in: rolesToFetchGlobally }, isActive: true },
      select: { id: true, role: true }
    });
    globalUsers.forEach((u) => addRecipient(u.role, u.id));
  }

  roles.forEach((role) => {
    switch (role) {
      case "CONNECTION_DESIGNER_ENGINEER":
        rfq.connectionDesignerRFQ?.forEach((cd) => {
          cd.CDEngineers?.forEach((c) => {
            if (c.isActive && c.role === "CONNECTION_DESIGNER_ENGINEER") addRecipient(role, c.id);
          });
        });
        break;
      case "CLIENT":
      case "CLIENT_ADMIN":
      case "CLIENT_PROJECT_COORDINATOR":
      case "CLIENT_GENERAL_CONSTRUCTOR":
      case "VENDOR":
      case "VENDOR_ADMIN":
        if (rfq.fabricator) {
          rfq.fabricator.pointOfContact?.forEach((p) => {
            if (p.isActive && p.role === role) addRecipient(role, p.id);
          });
          rfq.fabricator.wbtFabricatorPointOfContact?.forEach((p) => {
            if (p.isActive && p.role === role) addRecipient(role, p.id);
          });
        }
        rfq.vendorRFQ?.forEach((vendor) => {
          vendor.pointOfContacts?.forEach((p) => {
            if (p.isActive && p.role === role) addRecipient(role, p.id);
          });
        });
        break;
    }
  });

  return {
    rfq,
    recipientsByRole: new Map(
      Array.from(recipientsByRole.entries()).map(([role, ids]) => [role, Array.from(ids)])
    ),
  };
}

export async function notifyRfqStakeholders(
  rfqId: string,
  roles: UserRole[],
  payload: any,
  options: NotifyRfqStakeholdersOptions = {}
): Promise<void> {
  if (!roles.length) return;
  const { rfq, recipientsByRole } = await getRfqStakeholderRecipients(rfqId, roles);

  if (!rfq) return;

  const excludedUserIds = new Set((options.excludeUserIds || []).filter(Boolean));
  const filteredRecipientIds = Array.from(recipientsByRole.values())
    .flat()
    .filter((id) => !excludedUserIds.has(id));

  await notifyUsers(filteredRecipientIds, payload);
}

export async function notifyRfqStakeholdersByRole(
  rfqId: string,
  roles: UserRole[],
  payloadBuilder: RfqRolePayloadBuilder,
  options: NotifyRfqStakeholdersOptions = {}
): Promise<void> {
  if (!roles.length) return;

  const { rfq, recipientsByRole } = await getRfqStakeholderRecipients(rfqId, roles);
  if (!rfq) return;

  const excludedUserIds = new Set((options.excludeUserIds || []).filter(Boolean));

  await Promise.all(
    Array.from(recipientsByRole.entries()).map(async ([role, recipientIds]) => {
      const filteredRecipientIds = recipientIds.filter((id) => !excludedUserIds.has(id));
      if (!filteredRecipientIds.length) return;

      const payload = payloadBuilder(role, { rfq, recipientIds: filteredRecipientIds });
      if (!payload) return;

      await Promise.all(filteredRecipientIds.map((userId) => sendNotification(userId, payload)));
    })
  );
}
