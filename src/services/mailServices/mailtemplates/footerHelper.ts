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
  return `<!-- Footer -->
          <tr>
            <td bgcolor="#f4f4f4" style="padding: 20px; text-align: center; font-size: 12px; color: #999999;">
              © ${new Date().getFullYear()} Whiteboard Technologies Pvt Ltd. All Rights Reserved.
            </td>
          </tr>`;
}

export function getFooterSignatureHtml(fabricatorName?: string | null): string {
  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
      <tr>
        <td align="center" style="padding-bottom: 10px;">
          <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png"
               alt="Whiteboard Logo" width="170" border="0" style="display: block; width: 150px; max-width: 150px;" />
        </td>
      </tr>
      <tr>
        <td align="center" class="signature-details" valign="top" style="color: #777777; font-size: 14px;">
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
