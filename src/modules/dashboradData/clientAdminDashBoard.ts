import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Response } from "express";

export const clientAdminDashBoard = async (req: AuthenticateRequest, res: Response) => {
  try {
    const userId = req.user?.id;

   
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
        },
      }),

      prisma.changeOrder.count({
        where: {
          Project: { status: { in: ["ACTIVE", "ONHOLD"] } },
          Recipients: {
            FabricatorPointOfContacts: {
              some: { id: { in: fabricatorIds } },
            },
          },
          coResponses: { none: {} },
        },
      }),

      prisma.rFQ.count({
        where: {
          project: { status: { in: ["ACTIVE", "ONHOLD"] } },
          fabricatorId: { in: fabricatorIds },
          responses: { some: { childResponses: { none: {} } } },
        },
      }),

     
      prisma.submittals.count({
        where: {
          project: { status: { in: ["ACTIVE", "ONHOLD"] } },
          fabricator_id: { in: fabricatorIds },
          currentVersion: {
            responses: { none: {} },
          },
        },
      }),

      prisma.rFI.count({
        where: { project: { status: { in: ["ACTIVE", "ONHOLD"] } }, fabricator_id: { in: fabricatorIds } },
      }),

      prisma.rFQ.count({
        where: { project: { status: { in: ["ACTIVE", "ONHOLD"] } }, fabricatorId: { in: fabricatorIds } },
      }),

      prisma.submittals.count({
        where: { project: { status: { in: ["ACTIVE", "ONHOLD"] } }, fabricator_id: { in: fabricatorIds } },
      }),
    ]);

    const response: Record<string, any> = {
      totalActiveProjects: 0,
      totalCompleteProject: 0,
      totalOnHoldProject: 0,
      totalProjects,
      pendingRFI: newRFI,
      pendingChangeOrders,
      pendingRFQ,
      pendingSubmittals,
      totalRFI,
      totalRFQ,
      totalSubmittals,
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
      message: "CLIENT_ADMIN Dashboard data fetched successfully",
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in clientAdminDashBoard:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
