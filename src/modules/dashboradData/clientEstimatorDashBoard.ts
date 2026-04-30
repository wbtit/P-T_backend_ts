import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Response } from "express";

export const clientEstimatorDashBoard = async (req: AuthenticateRequest, res: Response) => {
  try {
    const userId = req.user?.id;

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
          project: { status: { in: ["ACTIVE", "ONHOLD"] } },
          fabricatorId: { in: fabricatorIds },
          responses: {
            some: {
              parentResponseId: null,
              childResponses: { none: {} },
            },
          },
        },
      }),

      prisma.rFQ.count({
        where: {
          project: { status: { in: ["ACTIVE", "ONHOLD"] } },
          fabricatorId: { in: fabricatorIds },
        },
      }),
    ]);

    const response: Record<string, any> = {
      pendingRFQ,
      totalRFQ,
    };

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