import { Response } from "express";
import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";

export const projectManagerDashBoard = async (
  req: AuthenticateRequest,
  res: Response
) => {
  try {
    const { role, id: userId } = req.user ?? {};

    if (!role || !userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    if (role !== "PROJECT_MANAGER") {
      return res.status(403).json({ message: "Access denied", success: false });
    }

    const now = new Date();

    const managerFilter = {
      managerID: userId,
    };

    const [
      projectStats,
      totalProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      pendingRFI,
      newRFI,
      pendingChangeOrders,
      newChangeOrders,
      pendingRFQ,
      newRFQ,
      pendingSubmittals,
      totalTeamMembers,
    ] = await Promise.all([
      prisma.project.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: managerFilter,
      }),
      prisma.project.count({ where: managerFilter }),
      prisma.task.count({
        where: {
          project: managerFilter,
        },
      }),
      prisma.task.count({
        where: {
          project: managerFilter,
          status: "COMPLETED",
        },
      }),
      prisma.task.count({
        where: {
          project: managerFilter,
          status: { not: "COMPLETED" },
          due_date: { lt: now },
        },
      }),
      prisma.rFI.count({
        where: {
          project: managerFilter,
          NOT: {
            rfiresponse: {
              some: {
                childResponses: {
                  some: {
                    wbtStatus: "COMPLETE",
                  },
                },
              },
            },
          },
        },
      }),
      prisma.rFI.count({
        where: {
          project: managerFilter,
          rfiresponse: { none: {} },
        },
      }),
      prisma.changeOrder.count({
        where: {
          Project: managerFilter,
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
      }),
      prisma.changeOrder.count({
        where: {
          Project: managerFilter,
          coResponses: { none: {} },
        },
      }),
      prisma.rFQ.count({
        where: {
          project: managerFilter,
          responses: {
            some: {
              childResponses: { none: {} },
            },
          },
        },
      }),
      prisma.rFQ.count({
        where: {
          project: managerFilter,
          responses: { none: {} },
        },
      }),
      prisma.submittals.count({
        where: {
          project: managerFilter,
          currentVersion: {
            responses: { none: {} },
          },
        },
      }),
      prisma.teamMember.count({
        where: {
          team: {
            project: {
              some: { managerID: userId },
            },
          },
        },
      }),
    ]);

    const response: Record<string, any> = {
      totalProjects,
      totalActiveProjects: 0,
      totalCompleteProject: 0,
      totalOnHoldProject: 0,
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      overdueTasks,
      taskCompletionRate:
        totalTasks === 0 ? 0 : Number(((completedTasks / totalTasks) * 100).toFixed(2)),
      totalTeamMembers,
      pendingRFI,
      newRFI,
      pendingChangeOrders,
      newChangeOrders,
      pendingRFQ,
      newRFQ,
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
      message: "Project manager dashboard data fetched successfully",
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in projectManagerDashBoard:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
