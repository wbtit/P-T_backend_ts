import { Response } from "express";
import { Status } from "@prisma/client";
import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";

const CONNECTION_DESIGNER_ADMIN_ALLOWED_ROLES = new Set([
  "CONNECTION_DESIGNER_ADMIN",
  "ADMIN",
]);

type ThreadResponseNode = {
  createdAt: Date;
  user?: {
    connectionDesignerId: string | null;
  } | null;
  childResponses?: ThreadResponseNode[];
};

const flattenThreadResponses = (responses: ThreadResponseNode[]): ThreadResponseNode[] => {
  const flattened: ThreadResponseNode[] = [];

  responses.forEach((response) => {
    flattened.push(response);

    if (response.childResponses?.length) {
      flattened.push(...flattenThreadResponses(response.childResponses));
    }
  });

  return flattened;
};

const needsCompanyAttention = (
  responses: ThreadResponseNode[],
  connectionDesignerId: string
) => {
  const flattened = flattenThreadResponses(responses);

  if (flattened.length === 0) {
    return true;
  }

  const latestResponse = flattened.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];

  return latestResponse.user?.connectionDesignerId !== connectionDesignerId;
};

export const connectionDesignerAdminDashBoard = async (
  req: AuthenticateRequest,
  res: Response
) => {
  try {
    const { role, id: userId, connectionDesignerId: tokenConnectionDesignerId } =
      req.user ?? {};

    if (!role || !userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    if (!CONNECTION_DESIGNER_ADMIN_ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ message: "Access denied", success: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        connectionDesignerId: true,
      },
    });

    const connectionDesignerId =
      tokenConnectionDesignerId ?? user?.connectionDesignerId ?? null;

    if (!connectionDesignerId) {
      return res.status(400).json({
        message: "Connection designer is not assigned for this user",
        success: false,
      });
    }

    const projectBaseWhere = {
      connectionDesignerID: connectionDesignerId,
      isDeleted: false,
    } as const;

    const activeProjectWhere = {
      ...projectBaseWhere,
      status: { in: [Status.ACTIVE, Status.ONHOLD] },
    };

    const [
      projectStats,
      totalProjects,
      activeEmployeeCount,
      rfisRequiringReview,
      cosRequiringReview,
      rfqsRequiringReview,
      submittalsRequiringReview,
    ] = await Promise.all([
      prisma.project.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: projectBaseWhere,
      }),
      prisma.project.count({
        where: projectBaseWhere,
      }),
      prisma.user.count({
        where: {
          connectionDesignerId,
          isActive: true,
        },
      }),
      prisma.rFI.findMany({
        where: {
          project: activeProjectWhere,
          OR: [
            { recepients: { connectionDesignerId } },
            { multipleRecipients: { some: { connectionDesignerId } } },
          ],
        },
        select: {
          id: true,
          rfiresponse: {
            where: { parentResponseId: null },
            select: {
              createdAt: true,
              user: {
                select: {
                  connectionDesignerId: true,
                },
              },
              childResponses: {
                select: {
                  createdAt: true,
                  user: {
                    select: {
                      connectionDesignerId: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.changeOrder.findMany({
        where: {
          Project: activeProjectWhere,
          OR: [
            { Recipients: { connectionDesignerId } },
            { multipleRecipients: { some: { connectionDesignerId } } },
          ],
        },
        select: {
          id: true,
          coResponses: {
            where: { parentResponseId: null },
            select: {
              createdAt: true,
              user: {
                select: {
                  connectionDesignerId: true,
                },
              },
              childResponses: {
                select: {
                  createdAt: true,
                  user: {
                    select: {
                      connectionDesignerId: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.rFQ.findMany({
        where: {
          connectionDesignerRFQ: {
            some: { id: connectionDesignerId },
          },
          isDeleted: false,
          status: {
            notIn: ["AWARDED", "REJECTED"],
          },
        },
        select: {
          id: true,
          responses: {
            where: { parentResponseId: null },
            select: {
              createdAt: true,
              user: {
                select: {
                  connectionDesignerId: true,
                },
              },
              childResponses: {
                select: {
                  createdAt: true,
                  user: {
                    select: {
                      connectionDesignerId: true,
                    },
                  },
                },
              },
            },
          },
          CDQuotas: {
            where: {
              connectionDesignerId,
              isDeleted: false,
            },
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.submittals.findMany({
        where: {
          project: activeProjectWhere,
          currentVersionId: { not: null },
          OR: [
            { recepients: { connectionDesignerId } },
            { multipleRecipients: { some: { connectionDesignerId } } },
          ],
        },
        select: {
          id: true,
          currentVersion: {
            select: {
              responses: {
                where: { parentResponseId: null },
                select: {
                  createdAt: true,
                  user: {
                    select: {
                      connectionDesignerId: true,
                    },
                  },
                  childResponses: {
                    select: {
                      createdAt: true,
                      user: {
                        select: {
                          connectionDesignerId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const pendingRFI = rfisRequiringReview.filter((item) =>
      needsCompanyAttention(item.rfiresponse, connectionDesignerId)
    ).length;

    const pendingChangeOrders = cosRequiringReview.filter((item) =>
      needsCompanyAttention(item.coResponses, connectionDesignerId)
    ).length;

    const pendingRFQ = rfqsRequiringReview.filter((item) => {
      if (item.responses.length === 0) {
        return item.CDQuotas.length === 0;
      }

      return needsCompanyAttention(item.responses, connectionDesignerId);
    }).length;

    const pendingSubmittals = submittalsRequiringReview.filter((item) =>
      needsCompanyAttention(item.currentVersion?.responses ?? [], connectionDesignerId)
    ).length;

    const response = {
      totalActiveProjects: 0,
      totalCompleteProject: 0,
      totalOnHoldProject: 0,
      totalProjects,
      activeEmployeeCount,
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
      message: "Connection designer admin dashboard data fetched successfully",
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in connectionDesignerAdminDashBoard:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
