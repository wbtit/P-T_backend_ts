
import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Response } from "express";
import { SubResStatus } from "@prisma/client";
import { getRfiSubmittalVisibilityFilter } from "../../utils/roleFilter";
import { getCachedDashboard, dashboardKeys } from "../../utils/dashboardCache";

export const clientDashBoard = async (req: AuthenticateRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const response = await getCachedDashboard(
      dashboardKeys.client(userId),
      async () => {
        const projectStats = await prisma.project.groupBy({
          by: ["status"],
          _count: { status: true },
          where: {
            status: { not: "INACTIVE" },
            clientProjectManagers: { some: { id: userId } }
          }
        });
        const totalProjects = await prisma.project.count({
          where: {
            status: { not: "INACTIVE" },
            clientProjectManagers: { some: { id: userId } }
          }
        });
        const activeEmployeeCount = await prisma.user.count({ where: { isActive: true } });
        const newRFI = await prisma.rFI.count({
          where: {
            project: { clientProjectManagers: { some: { id: userId } }, status: { not: "INACTIVE" } },
            rfiresponse: { none: {} },
            ...getRfiSubmittalVisibilityFilter(req.user?.role),
          },
        });
        const pendingRFI = await prisma.rFI.count({
          where: {
            project: { clientProjectManagers: { some: { id: userId } }, status: { not: "INACTIVE" } },
            ...getRfiSubmittalVisibilityFilter(req.user?.role),
            OR: [
              {
                rfiresponse: { none: {} },
                sender: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
              },
              {
                rfiresponse: {
                  some: {
                    childResponses: { none: {} },
                    responseState: { not: "COMPLETE" },
                    user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                  },
                },
              },
            ],
          },
        });
        const pendingChangeOrders = await prisma.changeOrder.count({
          where: {
            Project: {
              clientProjectManagers: { some: { id: userId } },
              status: { not: "INACTIVE" }
            },
            coResponses: { none: {} },
            isAproovedByAdmin: true
          }
        });
        const pendingRFQ = await prisma.rFQ.count({
          where: {
            senderId: userId,
            responses: {
              some: {
                childResponses: { none: {} },
                user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
              },
            },
          },
        });
        const pendingSubmittals = await prisma.submittals.count({
          where: {
            project: { clientProjectManagers: { some: { id: userId } }, status: { not: "INACTIVE" } },
            bfaStatus: false,
            stage: { not: "IFC" },
            ...getRfiSubmittalVisibilityFilter(req.user?.role),
          },
        });
        const resObj: Record<string, any> = {
          totalActiveProjects: 0,
          totalCompleteProject: 0,
          totalOnHoldProject: 0,
          totalProjects,
          pendingRFI,
          pendingChangeOrders,
          pendingRFQ,
          pendingSubmittals
        };
        const statusMap: Record<string, keyof typeof resObj> = {
          ACTIVE: "totalActiveProjects",
          COMPLETE: "totalCompleteProject",
          ONHOLD: "totalOnHoldProject",
        };
        projectStats.forEach(({ status, _count }) => {
          const key = statusMap[status];
          if (key) resObj[key] = _count.status;
        });

        return resObj;
      }
    );

    return res.status(200).json({
      message: " CLIENT  Dashboard data fetched successfully",
      success: true,
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching client dashboard data",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
