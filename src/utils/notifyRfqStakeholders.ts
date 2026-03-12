import { UserRole } from "@prisma/client";
import prisma from "../config/database/client";
import { notifyUsers } from "./notifyByRole";

export async function notifyRfqStakeholders(rfqId: string, roles: UserRole[], payload: any): Promise<void> {
  if (!roles.length) return;

  const rfq = await prisma.rFQ.findUnique({
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

  if (!rfq) return;

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
      case "CONNECTION_DESIGNER_ENGINEER":
        rfq.connectionDesignerRFQ?.forEach(cd => {
          cd.CDEngineers?.forEach(c => {
            if (c.isActive && c.role === "CONNECTION_DESIGNER_ENGINEER") recipientIds.add(c.id);
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
          rfq.fabricator.pointOfContact?.forEach(p => {
             if (p.isActive && p.role === role) recipientIds.add(p.id);
          });
          rfq.fabricator.wbtFabricatorPointOfContact?.forEach(p => {
             if (p.isActive && p.role === role) recipientIds.add(p.id);
          });
        }
        rfq.vendorRFQ?.forEach(vendor => {
          vendor.pointOfContacts?.forEach(p => {
            if (p.isActive && p.role === role) recipientIds.add(p.id);
          });
        });
        break;
    }
  });

  await notifyUsers(Array.from(recipientIds), payload);
}
