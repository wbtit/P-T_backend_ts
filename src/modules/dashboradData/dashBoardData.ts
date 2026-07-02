import { Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import prisma from "../../config/database/client";
import { SubResStatus } from "@prisma/client";
import { getRoleVisibilityFilter } from "../../utils/roleFilter";
import { getCachedDashboard, dashboardKeys } from "../../utils/dashboardCache";

const FULL_ACCESS_ROLES = new Set([
  "ADMIN",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "HUMAN_RESOURCE"
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

    const response = await getCachedDashboard(
      dashboardKeys.generic(userId, role),
      async () => {
        const projectStats = await prisma.project.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: projectFilter,
        });

        const totalProjects = await prisma.project.count({ where: projectFilter });

        const activeEmployeeCount = await prisma.user.count({ where: { isActive: true } });

        const pendingRFI = await prisma.rFI.count({
          where: {
            ...getRoleVisibilityFilter(role),
            OR: [
              {
                rfiresponse: { none: {} },
                sender: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
              },
              {
                rfiresponse: {
                  some: {
                    childResponses: { none: {} },
                    user: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                  },
                },
              },
            ],
          },
        });

        const newRFI = await prisma.rFI.count({
          where: {
            ...getRoleVisibilityFilter(role),
            rfiresponse: { none: {} },
          },
        });

        const pendingChangeOrders = await prisma.changeOrder.count({
          where: {
            NOT: {
              coResponses: {
                some: {
                  childResponses: {
                    some: { Status: "ACCEPT" },
                  },
                },
              },
            },
          },
        });

        const newChangeOrders = await prisma.changeOrder.count({
          where: {
            coResponses: { none: {} },
          },
        });

        const newRFQ = await prisma.rFQ.count({
          where: {
            responses: { none: {} },
          },
        });

        const pendingRFQ = await prisma.rFQ.count({
          where: {
            responses: {
              some: {
                childResponses: { none: {} },
                user: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } }
              }
            }
          }
        });

        const pendingSubmittals = await prisma.submittals.count({
          where: {
            bfaStatus: false,
            currentVersionId: { not: null },
            ...getRoleVisibilityFilter(role),
          },
        });

        const clientSidePendingRFI = await prisma.rFI.count({
          where: {
            project: { status: { in: ["ACTIVE", "ONHOLD"] } },
            ...getRoleVisibilityFilter(role),
            OR: [
              {
                rfiresponse: { none: {} },
                sender: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
              },
              {
                rfiresponse: {
                  some: {
                    childResponses: { none: {} },
                    user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                  },
                },
              },
            ],
          },
        });

        const clientSidePendingChangeOrders = await prisma.changeOrder.count({
          where: {
            Project: { status: { in: ["ACTIVE", "ONHOLD"] } },
            coResponses: { none: {} },
            isAproovedByAdmin: true,
          },
        });

        const clientSidePendingRFQ = await prisma.rFQ.count({
          where: {
            project: { status: { in: ["ACTIVE", "ONHOLD"] } },
            responses: {
              some: {
                childResponses: { none: {} },
                user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
              },
            },
          },
        });

        const clientSidePendingSubmittals = await prisma.submittals.count({
          where: {
            project: { status: { in: ["ACTIVE", "ONHOLD"] } },
            bfaStatus: false,
            ...getRoleVisibilityFilter(role),
          },
        });

        const resObj: Record<string, any> = {
          totalProjects,
          activeEmployeeCount,
          totalActiveProjects: 0,
          totalCompleteProject: 0,
          totalOnHoldProject: 0,
          pendingRFI,
          newRFI,
          pendingChangeOrders,
          newChangeOrders,
          newRFQ,
          pendingRFQ,
          pendingSubmittals,
          clientSidePendingActions: {
            rfi: clientSidePendingRFI,
            changeOrders: clientSidePendingChangeOrders,
            rfq: clientSidePendingRFQ,
            submittals: clientSidePendingSubmittals,
          }
        };

        const statusMap: Record<string, keyof typeof resObj> = {
          ACTIVE: "totalActiveProjects",
          COMPLETE: "totalCompleteProject",
          ONHOLD: "totalOnHoldProject",
        };

        projectStats.forEach(({ status, _count }) => {
          const key = statusMap[status];
          if (key) resObj[key] = _count._all;
        });

        return resObj;
      }
    );

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
