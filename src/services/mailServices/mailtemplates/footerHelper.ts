import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";

const CLIENT_ROLES: Set<UserRole> = new Set([
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_ACCOUNTANT",
  "CLIENT_ESTIMATOR",
  "CLIENT_PROJECT_COORDINATOR",
  "CLIENT_GENERAL_CONSTRUCTOR"
]);

export function getFooterHtml(fabricatorName?: string | null): string {
  const companyName = fabricatorName && fabricatorName.trim() ? fabricatorName : "Whiteboard Technologies Pvt Ltd";
  return `<!-- Footer -->
          <tr>
            <td bgcolor="#f4f4f4" style="padding: 20px; text-align: center; font-size: 12px; color: #999999;">
              © ${new Date().getFullYear()} ${companyName}. All Rights Reserved.
            </td>
          </tr>`;
}

export function getFooterSignatureHtml(fabricatorName?: string | null): string {
  return `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td class="signature-details" valign="top" style="border-left: 1px solid #e0e0e0; padding-left: 20px; color: #777777; font-size: 14px;">
                    <a href="https://ps.whiteboardtec.com/" style="color: #8cc63f; text-decoration: none; font-weight: bold;">Project Station</a>
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    <a href="https://www.whiteboardtec.com/" style="color: #8cc63f; text-decoration: none; font-weight: bold;">Whiteboard Technologies</a>
                  </td>
                </tr>
              </table>`;
}

/**
 * Resolves the fabricator name if the triggering user has a client role.
 * Otherwise returns null (which defaults to Whiteboard Technologies Pvt Ltd).
 */
export async function getFabricatorNameForUser(userId: string, role?: string): Promise<string | null> {
  if (!role || !CLIENT_ROLES.has(role as UserRole)) {
    return null;
  }

  try {
    const fabricator = await prisma.fabricator.findFirst({
      where: {
        pointOfContact: {
          some: { id: userId }
        }
      },
      select: { fabName: true }
    });
    return fabricator?.fabName || null;
  } catch (error) {
    console.error("Error fetching fabricator name for user:", error);
    return null;
  }
}
