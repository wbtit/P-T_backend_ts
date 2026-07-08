import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Response } from "express";
import { getCachedDashboard, dashboardKeys } from "../../utils/dashboardCache";

export const clientEstimatorDashBoard = async (req: AuthenticateRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const response = await getCachedDashboard(
      dashboardKeys.clientEstimator(userId),
      async () => {
        const fabricators = await prisma.fabricator.findMany({
          where: {
            pointOfContact: {
              some: { id: userId, role: "CLIENT_ESTIMATOR" },
            },
          },
          select: { id: true },
        });

        const fabricatorIds = fabricators.map((f) => f.id);

        const [
          pendingRFQ,
          totalRFQ,
        ] = await Promise.all([
          prisma.rFQ.count({
            where: {
              fabricatorId: { in: fabricatorIds },
              sender: { role: "CLIENT_ESTIMATOR" },
              responses: {
                some: {
                  childResponses: { none: {} },
                  user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                },
              },
            },
          }),

          prisma.rFQ.count({
            where: {
              fabricatorId: { in: fabricatorIds },
              sender: { role: "CLIENT_ESTIMATOR" },
            },
          }),
        ]);

        return {
          pendingRFQ,
          totalRFQ,
        };
      }
    );

    return res.status(200).json({
      message: "CLIENT_ESTIMATOR Dashboard data fetched successfully",
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in clientEstimatorDashBoard:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};