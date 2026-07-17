import { Response } from "express";
import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { UserRole } from "@prisma/client";
import { computeSubmittalStatus } from "../submittals/utils/statusHelper";
import { getRfiSubmittalVisibilityFilter } from "../../utils/roleFilter";
import { getCachedDashboard, dashboardKeys } from "../../utils/dashboardCache";
import { getUnapprovedCounts } from "../../utils/unapprovedListFetcher";

const CLIENT_ROLES: UserRole[] = [
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_ACCOUNTANT",
  "CLIENT_ESTIMATOR",
  "CLIENT_PROJECT_COORDINATOR",
  "CLIENT_GENERAL_CONSTRUCTOR",
];

export const operationExecutiveDashBoard = async (
  req: AuthenticateRequest,
  res: Response
) => {
  try {
    const { role, id: userId } = req.user ?? {};

    if (!role || !userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    if (role !== "OPERATION_EXECUTIVE") {
      return res.status(403).json({ message: "Access denied", success: false });
    }

    const response = await getCachedDashboard(
      dashboardKeys.operationExecutive(userId),
      async () => {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const [projectStatsRaw, totalProjects, delayedClientRFIs, submittals, rfqsForRecipient, unapprovedCounts] =
          await Promise.all([
            prisma.project.groupBy({
              by: ["status"],
              _count: { _all: true },
            }),
            prisma.project.count(),
            prisma.rFI.findMany({
              where: {
                date: { lte: twoWeeksAgo },
                recepients: {
                  role: { in: CLIENT_ROLES },
                },
                rfiresponse: { none: {} },
                ...getRfiSubmittalVisibilityFilter(role),
              },
              select: {
                id: true,
                serialNo: true,
                subject: true,
                date: true,
                project: { select: { id: true, name: true } },
                sender: {
                  select: { id: true, firstName: true, middleName: true, lastName: true },
                },
                recepients: {
                  select: { id: true, firstName: true, middleName: true, lastName: true, role: true },
                },
              },
              orderBy: { date: "asc" },
            }),
            prisma.submittals.findMany({
              where: getRfiSubmittalVisibilityFilter(role),
              select: {
                id: true,
                serialNo: true,
                subject: true,
                stage: true,
                status: true,
                bfaStatus: true,
                date: true,
                currentVersionId: true,
                currentVersion: {
                  select: {
                    createdAt: true,
                  },
                },
                project: { select: { id: true, name: true } },
                sender: { select: { id: true, firstName: true, middleName: true, lastName: true } },
                recepients: {
                  select: { id: true, firstName: true, middleName: true, lastName: true },
                },
              },
              orderBy: { date: "desc" },
              take: 200,
            }),
            prisma.rFQ.findMany({
              where: { recipientId: userId },
              select: {
                id: true,
                serialNo: true,
                projectName: true,
                projectNumber: true,
                subject: true,
                status: true,
                wbtStatus: true,
                createdAt: true,
                sender: {
                  select: { id: true, firstName: true, middleName: true, lastName: true },
                },
              },
              orderBy: { createdAt: "desc" },
            }),
            getUnapprovedCounts({}, role)
          ]);

        const projectStats: Record<string, number> = {
          totalProjects,
          ACTIVE: 0,
          COMPLETE: 0,
          ONHOLD: 0,
          INACTIVE: 0,
          DELAY: 0,
          ASSIGNED: 0,
        };

        projectStatsRaw.forEach(({ status, _count }) => {
          projectStats[status] = _count._all;
        });

        return {
          projectStats,
          projectTrackingActions: {
            rfiClientNoResponseOverTwoWeeks: delayedClientRFIs,
            submittalsTracking: submittals.map(submittal => computeSubmittalStatus(submittal)),
            rfqsWhereRecipientIsMe: rfqsForRecipient,
          },
          ...unapprovedCounts
        };
      }
    );

    return res.status(200).json({
      message: "Operation executive dashboard data fetched successfully",
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in operationExecutiveDashBoard:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
