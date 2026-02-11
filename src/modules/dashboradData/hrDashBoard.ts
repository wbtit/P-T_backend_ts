import { Response } from "express";
import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";

const HR_ALLOWED_ROLES = new Set(["HUMAN_RESOURCE", "ADMIN"]);

export const hrDashBoard = async (req: AuthenticateRequest, res: Response) => {
  try {
    const { role } = req.user ?? {};

    if (!role) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    if (!HR_ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ message: "Access denied", success: false });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const period = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

    const [
      totalEmployees,
      activeEmployeeCount,
      inactiveEmployeeCount,
      newEmployeesThisMonth,
      totalDepartments,
      totalTeams,
      roleDistributionRaw,
      departmentDistributionRaw,
      totalMeasRecords,
      totalBiasRecords,
      totalEpsRecords,
      currentMonthMeasCount,
      currentMonthBiasCount,
      currentMonthEpsCount,
      measAggregateCurrent,
      biasAggregateCurrent,
      epsAggregateCurrent,
      topManagersCurrentRaw,
      topEmployeesCurrentRaw,
      bottomEmployeesCurrentRaw,
      underEstimatingManagersCount,
      overEstimatingManagersCount,
      balancedManagersCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.department.count({ where: { isDeleted: false } }),
      prisma.team.count({ where: { isDeleted: false } }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      prisma.department.findMany({
        where: { isDeleted: false },
        select: {
          name: true,
          _count: { select: { users: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.managerEstimationScore.count(),
      prisma.managerBiasRecord.count(),
      prisma.employeePerformanceScore.count(),
      prisma.managerEstimationScore.count({ where: { period } }),
      prisma.managerBiasRecord.count({ where: { period } }),
      prisma.employeePerformanceScore.count({ where: { period } }),
      prisma.managerEstimationScore.aggregate({
        where: { period },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
      }),
      prisma.managerBiasRecord.aggregate({
        where: { period },
        _avg: { biasScore: true },
        _min: { biasScore: true },
        _max: { biasScore: true },
      }),
      prisma.employeePerformanceScore.aggregate({
        where: { period },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
      }),
      prisma.managerEstimationScore.findMany({
        where: { period },
        select: {
          managerId: true,
          score: true,
          manager: {
            select: { firstName: true, middleName: true, lastName: true, email: true },
          },
        },
        orderBy: { score: "desc" },
        take: 5,
      }),
      prisma.employeePerformanceScore.findMany({
        where: { period },
        select: {
          employeeId: true,
          score: true,
          employee: {
            select: { firstName: true, middleName: true, lastName: true, email: true },
          },
        },
        orderBy: { score: "desc" },
        take: 5,
      }),
      prisma.employeePerformanceScore.findMany({
        where: { period },
        select: {
          employeeId: true,
          score: true,
          employee: {
            select: { firstName: true, middleName: true, lastName: true, email: true },
          },
        },
        orderBy: { score: "asc" },
        take: 5,
      }),
      prisma.managerBiasRecord.count({ where: { period, biasScore: { gt: 0.2 } } }),
      prisma.managerBiasRecord.count({ where: { period, biasScore: { lt: -0.2 } } }),
      prisma.managerBiasRecord.count({ where: { period, biasScore: { gte: -0.2, lte: 0.2 } } }),
    ]);

    const roleDistribution = roleDistributionRaw.map((item) => ({
      role: item.role,
      count: item._count._all,
    }));

    const departmentDistribution = departmentDistributionRaw.map((item) => ({
      departmentName: item.name,
      employeeCount: item._count.users,
    }));

    const topManagersCurrent = topManagersCurrentRaw.map((item) => ({
      managerId: item.managerId,
      managerName: [item.manager.firstName, item.manager.middleName, item.manager.lastName]
        .filter(Boolean)
        .join(" "),
      email: item.manager.email ?? "",
      score: item.score,
    }));

    const topEmployeesCurrent = topEmployeesCurrentRaw.map((item) => ({
      employeeId: item.employeeId,
      employeeName: [item.employee.firstName, item.employee.middleName, item.employee.lastName]
        .filter(Boolean)
        .join(" "),
      email: item.employee.email ?? "",
      score: item.score,
    }));

    const bottomEmployeesCurrent = bottomEmployeesCurrentRaw.map((item) => ({
      employeeId: item.employeeId,
      employeeName: [item.employee.firstName, item.employee.middleName, item.employee.lastName]
        .filter(Boolean)
        .join(" "),
      email: item.employee.email ?? "",
      score: item.score,
    }));

    return res.status(200).json({
      message: "HR dashboard data fetched successfully",
      success: true,
      data: {
        totalEmployees,
        activeEmployeeCount,
        inactiveEmployeeCount,
        newEmployeesThisMonth,
        totalDepartments,
        totalTeams,
        roleDistribution,
        departmentDistribution,
        scoreSummary: {
          period,
          totalMeasRecords,
          totalBiasRecords,
          totalEpsRecords,
          currentMonthMeasCount,
          currentMonthBiasCount,
          currentMonthEpsCount,
          currentMonthAverageMeasScore: measAggregateCurrent._avg.score ?? 0,
          currentMonthMinMeasScore: measAggregateCurrent._min.score ?? 0,
          currentMonthMaxMeasScore: measAggregateCurrent._max.score ?? 0,
          currentMonthAverageBiasScore: biasAggregateCurrent._avg.biasScore ?? 0,
          currentMonthMinBiasScore: biasAggregateCurrent._min.biasScore ?? 0,
          currentMonthMaxBiasScore: biasAggregateCurrent._max.biasScore ?? 0,
          currentMonthAverageEpsScore: epsAggregateCurrent._avg.score ?? 0,
          currentMonthMinEpsScore: epsAggregateCurrent._min.score ?? 0,
          currentMonthMaxEpsScore: epsAggregateCurrent._max.score ?? 0,
          underEstimatingManagersCount,
          overEstimatingManagersCount,
          balancedManagersCount,
        },
        rankings: {
          topManagersCurrent,
          topEmployeesCurrent,
          bottomEmployeesCurrent,
        },
      },
    });
  } catch (error) {
    console.error("Error in hrDashBoard:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
