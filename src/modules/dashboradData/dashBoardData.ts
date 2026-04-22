import { Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import prisma from "../../config/database/client";

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

    const projectStats = await prisma.project.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: projectFilter,
    });

    const totalProjects = await prisma.project.count({ where: projectFilter });

    const activeEmployeeCount = await prisma.user.count({ where: { isActive: true } });

    const pendingRFI = await prisma.rFI.count({
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
    });

    const newRFI = await prisma.rFI.count({
      where: {
        rfiresponse: { none: {} },
      },
    });

    const pendingChangeOrders = await prisma.changeOrder.count({
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
     where:{
        responses:{
          some:{
            parentResponseId: null,
            childResponses:{every:{status:"RECEIVED"}}
          }
      }
     }
    });
    const pendingSubmittals = await prisma.submittals.count({
      where: {
        status: false,
        currentVersionId: { not: null },
        currentVersion: {
          responses: {
            some: {
              parentResponseId: null,
              childResponses: { none: {} }
            }
          }
        }
      },
    });

    const clientSidePendingRFI = await prisma.rFI.count({
      where: {
        project: { status: { in: ["ACTIVE", "ONHOLD"] } },
        rfiresponse: { none: {} },
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
            parentResponseId: null,
            childResponses: { none: {} },
          },
        },
      },
    });

    const clientSidePendingSubmittals = await prisma.submittals.count({
      where: {
        project: { status: { in: ["ACTIVE", "ONHOLD"] } },
        currentVersion: {
          responses: { none: {} },
        },
      },
    });

    const response: Record<string, any> = {
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
