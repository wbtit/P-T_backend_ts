import { Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { getUnapprovedLists } from "../../utils/unapprovedListFetcher";
import prisma from "../../config/database/client";

const FULL_ACCESS_ROLES = new Set([
  "ADMIN",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "HUMAN_RESOURCE"
]);

export const unapprovedListsHandler = async (
  req: AuthenticateRequest,
  res: Response
) => {
  try {
    const { role, id: userId } = req.user ?? {};

    if (!role || !userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    let projectFilter: Record<string, any> = {};

    if (!FULL_ACCESS_ROLES.has(role)) {
      if (role === "PROJECT_MANAGER" || role === "TEAM_LEAD") {
        projectFilter = { managerID: userId };
      } else if (role === "DEPT_MANAGER") {
        // Need to find the department for this user to get departmentID
        const dept = await prisma.department.findFirst({
          where: { managerIds: { some: { id: userId } } }
        });
        if (dept) {
          projectFilter = { departmentID: dept.id };
        } else {
          projectFilter = { deptManagerID: userId }; // Fallback
        }
      } else {
        return res.status(403).json({ message: "Access denied", success: false });
      }
    }

    const unapprovedLists = await getUnapprovedLists(projectFilter, role);

    return res.status(200).json({
      message: "Unapproved lists fetched successfully",
      success: true,
      data: unapprovedLists
    });
  } catch (error) {
    console.error("Error fetching unapproved lists:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
