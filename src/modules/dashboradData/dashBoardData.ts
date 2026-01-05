import { Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import prisma from "../../config/database/client";

const FULL_ACCESS_ROLES = new Set([
  "ADMIN",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "HUMAN_RESOURCE",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "CLIENT_GENERAL_CONSTRUCTOR",
]);

export const DashBoradData = async (
  req: AuthenticateRequest,
  res: Response
) => {
  try {
    const { role, id: userId } = req.user ?? {};

    if (!role || !userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let projectFilter: Record<string, any> = {};

    if (!FULL_ACCESS_ROLES.has(role)) {
      const roleFilters: Record<string, Record<string, any>> = {
        PROJECT_MANAGER: { managerID: userId },
        TEAM_LEAD: { managerID: userId },
        DEPT_MANAGER: { deptManagerID: userId },
        SALES_MANAGER: {
          rfq: {
            salesPersonId: { not: null },
          },
        },
        SALES_PERSON: {
          rfq: {
            salesPersonId: userId,
          },
        },
      };

      projectFilter = roleFilters[role];

      if (!projectFilter) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const [
      projectStats,
      totalProjects,
      activeEmployeeCount,
      pendingRFI,
      pendingChangeOrders,
      pendingRFQ,
      pendingSubmittals,
    ] = await Promise.all([
      prisma.project.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: projectFilter,
      }),

      prisma.project.count({ where: projectFilter }),

      prisma.user.count({ where: { isActive: true } }),

      prisma.rFI.count({
    
        where: {
    NOT: {
      rfiresponse: {
        some: {
          childResponses: {
            some: {
              [role === "CLIENT" || role === "CLIENT_ADMIN"
                         ? "responseState"
                         : "wbtStatus"]: "COMPLETE",
            },
          },
        },
      },
    },
  },
      }),

      prisma.changeOrder.count({
        where: {
          NOT:{
            coResponses: {
            some: {
              childResponses: {
                some: { Status: "ACCEPT" },
              },
            },
          }, 
          }
        },
      }),

      prisma.rFQ.count({
        where: {
          responses: { none: {} },
        },
      }),

      prisma.submittals.count({
        where: {
          status: false,
          currentVersion: { isNot: null },
        },
      }),
    ]);

    const response = {
      totalProjects,
      activeEmployeeCount,
      totalActiveProjects: 0,
      totalCompleteProject: 0,
      totalOnHoldProject: 0,
      pendingRFI,
      pendingChangeOrders,
      pendingRFQ,
      pendingSubmittals,
    };

    const statusMap: Record<string, keyof typeof response> = {
      ACTIVE: "totalActiveProjects",
      COMPLETE: "totalCompleteProject",
      ONHOLD: "totalOnHoldProject",
    };

    projectStats.forEach(({ status, _count }) => {
      const key = statusMap[status];
      if (key) response[key] = _count._all;
    });

    return res.status(200).json({
      message: "Success",
      statusCode: 200,
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in DashBoradData:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
