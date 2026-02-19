import { Response } from "express";
import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Prisma, RFQStatus } from "@prisma/client";

const SALES_STATUSES_IN_PIPELINE: RFQStatus[] = [
  "OPEN",
  "IN_REVIEW",
  "ASSIGNED_FOR_ESTIMATION",
  "ESTIMATION_IN_PROGRESS",
  "ESTIMATION_COMPLETED",
  "QUOTED",
  "RE_APPROVAL",
];

const toPercent = (value: number) => Number(value.toFixed(2));

const parseBidPrice = (input?: string | null): number => {
  if (!input) return 0;
  const numeric = Number(String(input).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

export const salesDashBoard = async (
  req: AuthenticateRequest,
  res: Response
) => {
  try {
    const { id: userId } = req.user ?? {};

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const rfqWhere: Prisma.RFQWhereInput = {};

    const [
      totalRFQs,
      awardedRFQs,
      rejectedRFQs,
      quotedRFQs,
      inPipelineRFQs,
      respondedRFQs,
      convertedToProjects,
      rfqsWithBidPrice,
      totalProjectsFromSales,
      activeProjectsFromSales,
      completedProjectsFromSales,
      salesPeopleCounts,
      salesPeopleAwardedCounts,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      partiallyPaidInvoices,
      cancelledInvoices,
      totalInvoiceAggregate,
      collectedInvoiceAggregate,
      totalClients,
    ] = await Promise.all([
      prisma.rFQ.count({ where: rfqWhere }),
      prisma.rFQ.count({ where: { ...rfqWhere, status: "AWARDED" } }),
      prisma.rFQ.count({ where: { ...rfqWhere, status: "REJECTED" } }),
      prisma.rFQ.count({ where: { ...rfqWhere, status: "QUOTED" } }),
      prisma.rFQ.count({
        where: {
          ...rfqWhere,
          status: { in: SALES_STATUSES_IN_PIPELINE },
        },
      }),
      prisma.rFQ.count({
        where: {
          ...rfqWhere,
          responses: { some: {} },
        },
      }),
      prisma.rFQ.count({
        where: {
          ...rfqWhere,
          project: { isNot: null },
        },
      }),
      prisma.rFQ.findMany({
        where: rfqWhere,
        select: { bidPrice: true },
      }),
      prisma.project.count({
        where: {
          rfq: rfqWhere,
        },
      }),
      prisma.project.count({
        where: {
          status: "ACTIVE",
          rfq: rfqWhere,
        },
      }),
      prisma.project.count({
        where: {
          status: "COMPLETE",
          rfq: rfqWhere,
        },
      }),
      prisma.rFQ.groupBy({
        by: ["salesPersonId"],
        where: {
          ...rfqWhere,
          salesPersonId: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.rFQ.groupBy({
        by: ["salesPersonId"],
        where: {
          ...rfqWhere,
          salesPersonId: { not: null },
          status: "AWARDED",
        },
        _count: { _all: true },
      }),
      prisma.invoice.count(),
      prisma.invoice.count({
        where: {
          OR: [{ paymentStatus: true }, { status: "PAID" }],
        },
      }),
      prisma.invoice.count({
        where: { status: "PENDING" },
      }),
      prisma.invoice.count({
        where: { status: "OVERDUE" },
      }),
      prisma.invoice.count({
        where: { status: "PARTIALLY_PAID" },
      }),
      prisma.invoice.count({
        where: { status: "CANCELLED" },
      }),
      prisma.invoice.aggregate({
        _sum: { totalInvoiceValue: true },
      }),
      prisma.invoice.aggregate({
        where: {
          OR: [{ paymentStatus: true }, { status: "PAID" }],
        },
        _sum: { totalInvoiceValue: true },
      }),
     prisma.fabricator.count()
    ]);

    const totalBidPrice = rfqsWithBidPrice.reduce(
      (sum, row) => sum + parseBidPrice(row.bidPrice),
      0
    );
    const avgBidPrice =
      totalRFQs > 0 ? Number((totalBidPrice / totalRFQs).toFixed(2)) : 0;

    const quoteToAwardRate =
      quotedRFQs > 0 ? toPercent((awardedRFQs / quotedRFQs) * 100) : 0;
    const winRate = totalRFQs > 0 ? toPercent((awardedRFQs / totalRFQs) * 100) : 0;
    const responseRate =
      totalRFQs > 0 ? toPercent((respondedRFQs / totalRFQs) * 100) : 0;
    const projectConversionRate =
      totalRFQs > 0 ? toPercent((convertedToProjects / totalRFQs) * 100) : 0;
    const totalInvoicedValue = totalInvoiceAggregate._sum.totalInvoiceValue ?? 0;
    const collectedInvoiceValue =
      collectedInvoiceAggregate._sum.totalInvoiceValue ?? 0;
    const collectionRate =
      totalInvoicedValue > 0
        ? toPercent((collectedInvoiceValue / totalInvoicedValue) * 100)
        : 0;
    const avgInvoiceValue =
      totalInvoices > 0 ? Number((totalInvoicedValue / totalInvoices).toFixed(2)) : 0;

    const typedSalesPeopleCounts = salesPeopleCounts as Array<{
      salesPersonId: string | null;
      _count: { _all: number };
    }>;
    const typedSalesPeopleAwardedCounts = salesPeopleAwardedCounts as Array<{
      salesPersonId: string | null;
      _count: { _all: number };
    }>;

    const salesPersonIds = typedSalesPeopleCounts
      .map((item) => item.salesPersonId)
      .filter((id): id is string => Boolean(id));
    const salesUsers = await prisma.user.findMany({
      where: { id: { in: salesPersonIds } },
      select: { id: true, firstName: true, middleName: true, lastName: true },
    });

    const userNameMap = new Map(
      salesUsers.map((user) => [
        user.id,
        [user.firstName, user.middleName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim(),
      ])
    );
    const awardedMap = new Map(
      typedSalesPeopleAwardedCounts
        .filter((item) => item.salesPersonId)
        .map((item) => [item.salesPersonId as string, item._count._all])
    );

    const topSalesPeople = typedSalesPeopleCounts
      .map((item) => {
        const salesPersonId = item.salesPersonId as string;
        const total = item._count._all;
        const awarded = awardedMap.get(salesPersonId) ?? 0;
        return {
          salesPersonId,
          name: userNameMap.get(salesPersonId) ?? "Unknown",
          totalRFQs: total,
          awardedRFQs: awarded,
          winRate: total > 0 ? toPercent((awarded / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.awardedRFQs - a.awardedRFQs || b.totalRFQs - a.totalRFQs)
      .slice(0, 5);

    const data = {
      totalRFQs,
      inPipelineRFQs,
      quotedRFQs,
      awardedRFQs,
      rejectedRFQs,
      respondedRFQs,
      totalProjectsFromSales,
      activeProjectsFromSales,
      completedProjectsFromSales,
      winRate,
      quoteToAwardRate,
      responseRate,
      projectConversionRate,
      totalBidPrice: Number(totalBidPrice.toFixed(2)),
      avgBidPrice,
      topSalesPeople,
      invoiceAnalytics: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        partiallyPaidInvoices,
        cancelledInvoices,
        totalInvoicedValue: Number(totalInvoicedValue.toFixed(2)),
        collectedInvoiceValue: Number(collectedInvoiceValue.toFixed(2)),
        collectionRate,
        avgInvoiceValue,
        totalClients,
      },
    };

    return res.status(200).json({
      message: "Sales dashboard data fetched successfully",
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in salesDashBoard:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
