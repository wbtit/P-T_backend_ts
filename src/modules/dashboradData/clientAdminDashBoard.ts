import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Response } from "express";
import { SubResStatus } from "@prisma/client";
import { getRfiSubmittalVisibilityFilter } from "../../utils/roleFilter";
import { getCachedDashboard, dashboardKeys } from "../../utils/dashboardCache";

export const clientAdminDashBoard = async (req: AuthenticateRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const response = await getCachedDashboard(
      dashboardKeys.clientAdmin(userId),
      async () => {
        const fabricators = await prisma.fabricator.findMany({
          where: {
            pointOfContact: {
              some: { id: userId, role: "CLIENT_ADMIN" },
            },
          },
          select: { id: true },
        });

        const fabricatorIds = fabricators.map((f) => f.id);

        const [
          projectStats,
          totalProjects,
          newRFI,
          pendingRFI,
          pendingChangeOrders,
          pendingRFQ,
          pendingSubmittals,
          totalRFI,
          totalRFQ,
          totalSubmittals,
        ] = await Promise.all([
          prisma.project.groupBy({
            by: ["status"],
            _count: { _all: true },
            where: {
              status: { not: "INACTIVE" },
              fabricatorID: { in: fabricatorIds },
            },
          }),

          prisma.project.count({
            where: {
              status: { not: "INACTIVE" },
              fabricatorID: { in: fabricatorIds },
            },
          }),

          prisma.rFI.count({
            where: {
              project: { status: { in: ["ACTIVE", "ONHOLD"] } },
              fabricator_id: { in: fabricatorIds },
              rfiresponse: { none: {} },
              ...getRfiSubmittalVisibilityFilter(req.user?.role),
            },
          }),

          prisma.rFI.count({
            where: {
              project: { status: { in: ["ACTIVE", "ONHOLD"] } },
              fabricator_id: { in: fabricatorIds },
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
          }),

          prisma.changeOrder.count({
            where: {
              Project: {
                status: { in: ["ACTIVE", "ONHOLD"] },
                fabricatorID: { in: fabricatorIds }
              },
              coResponses: { none: {} },
              isAproovedByAdmin: true,
            },
          }),
          prisma.rFQ.count({
            where: {
              fabricatorId: { in: fabricatorIds },
              status: "WBT_SUBMITTED",
            },
          }),

          prisma.submittals.count({
            where: {
              project: { status: { in: ["ACTIVE", "ONHOLD"] } },
              fabricator_id: { in: fabricatorIds },
              bfaStatus: false,
              stage: { not: "IFC" },
              ...getRfiSubmittalVisibilityFilter(req.user?.role),
            },
          }),

          prisma.rFI.count({
            where: { project: { status: { in: ["ACTIVE", "ONHOLD"] } }, fabricator_id: { in: fabricatorIds }, ...getRfiSubmittalVisibilityFilter(req.user?.role) },
          }),

          prisma.rFQ.count({
            where: { project: { status: { in: ["ACTIVE", "ONHOLD"] } }, fabricatorId: { in: fabricatorIds } },
          }),

          prisma.submittals.count({
            where: { project: { status: { in: ["ACTIVE", "ONHOLD"] } }, fabricator_id: { in: fabricatorIds }, ...getRfiSubmittalVisibilityFilter(req.user?.role) },
          }),
        ]);

        const responseObj: Record<string, any> = {
          totalActiveProjects: 0,
          totalCompleteProject: 0,
          totalOnHoldProject: 0,
          totalProjects,
          pendingRFI,
          pendingChangeOrders,
          pendingRFQ,
          pendingSubmittals,
          totalRFI,
          totalRFQ,
          totalSubmittals,
        };

        const statusMap: Record<string, keyof typeof responseObj> = {
          ACTIVE: "totalActiveProjects",
          COMPLETE: "totalCompleteProject",
          ONHOLD: "totalOnHoldProject",
        };

        projectStats.forEach(({ status, _count }) => {
          const key = statusMap[status];
          if (key) responseObj[key] = _count._all;
        });

        return responseObj;
      }
    );

    return res.status(200).json({
      message: "CLIENT_ADMIN Dashboard data fetched successfully",
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in clientAdminDashBoard:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};
