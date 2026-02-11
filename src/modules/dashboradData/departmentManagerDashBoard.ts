import { Response } from "express";
import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";

const DEPARTMENT_MANAGER_ALLOWED_ROLES = new Set(["DEPT_MANAGER", "ADMIN"]);

export const departmentManagerDashBoard = async (
  req: AuthenticateRequest,
  res: Response
) => {
  try {
    const { role, id: userId } = req.user ?? {};

    if (!role || !userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    if (!DEPARTMENT_MANAGER_ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ message: "Access denied", success: false });
    }

    const manager = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    });

    if (!manager?.departmentId) {
      return res.status(400).json({
        message: "Department is not assigned for this manager",
        success: false,
      });
    }

    const departmentId = manager.departmentId;
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    const [
      department,
      totalEmployees,
      activeEmployees,
      totalTeams,
      totalProjects,
      projectStatusRaw,
      totalTasks,
      completedTasks,
      taskStatusRaw,
      measOverall,
      biasOverall,
      epsOverall,
      measCurrent,
      biasCurrent,
      epsCurrent,
      topEmployeesCurrentRaw,
      topManagersCurrentRaw,
    ] = await Promise.all([
      prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true, name: true },
      }),
      prisma.user.count({ where: { departmentId } }),
      prisma.user.count({ where: { departmentId, isActive: true } }),
      prisma.team.count({ where: { departmentID: departmentId, isDeleted: false } }),
      prisma.project.count({ where: { departmentID: departmentId } }),
      prisma.project.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { departmentID: departmentId },
      }),
      prisma.task.count({ where: { departmentId } }),
      prisma.task.count({ where: { departmentId, status: "COMPLETED" } }),
      prisma.task.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { departmentId },
      }),
      prisma.managerEstimationScore.aggregate({
        where: { project: { departmentID: departmentId } },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
        _count: { _all: true },
      }),
      prisma.managerBiasRecord.aggregate({
        where: {
          OR: [
            { project: { departmentID: departmentId } },
            { manager: { departmentId } },
          ],
        },
        _avg: { biasScore: true },
        _min: { biasScore: true },
        _max: { biasScore: true },
        _count: { _all: true },
      }),
      prisma.employeePerformanceScore.aggregate({
        where: { employee: { departmentId } },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
        _count: { _all: true },
      }),
      prisma.managerEstimationScore.aggregate({
        where: { period, project: { departmentID: departmentId } },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
        _count: { _all: true },
      }),
      prisma.managerBiasRecord.aggregate({
        where: {
          period,
          OR: [
            { project: { departmentID: departmentId } },
            { manager: { departmentId } },
          ],
        },
        _avg: { biasScore: true },
        _min: { biasScore: true },
        _max: { biasScore: true },
        _count: { _all: true },
      }),
      prisma.employeePerformanceScore.aggregate({
        where: { period, employee: { departmentId } },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
        _count: { _all: true },
      }),
      prisma.employeePerformanceScore.findMany({
        where: { period, employee: { departmentId } },
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
      prisma.managerEstimationScore.findMany({
        where: { period, project: { departmentID: departmentId } },
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
    ]);

    const projectStatusDistribution = projectStatusRaw.map((item) => ({
      status: item.status,
      count: item._count._all,
    }));

    const taskStatusDistribution = taskStatusRaw.map((item) => ({
      status: item.status,
      count: item._count._all,
    }));

    const topEmployeesCurrent = topEmployeesCurrentRaw.map((item) => ({
      employeeId: item.employeeId,
      employeeName: [item.employee.firstName, item.employee.middleName, item.employee.lastName]
        .filter(Boolean)
        .join(" "),
      email: item.employee.email ?? "",
      score: item.score,
    }));

    const topManagersCurrent = topManagersCurrentRaw.map((item) => ({
      managerId: item.managerId,
      managerName: [item.manager.firstName, item.manager.middleName, item.manager.lastName]
        .filter(Boolean)
        .join(" "),
      email: item.manager.email ?? "",
      score: item.score,
    }));

    return res.status(200).json({
      message: "Department manager dashboard data fetched successfully",
      success: true,
      data: {
        manager: {
          id: manager.id,
          name: [manager.firstName, manager.middleName, manager.lastName]
            .filter(Boolean)
            .join(" "),
        },
        department: {
          id: department?.id ?? departmentId,
          name: department?.name ?? "Unknown Department",
        },
        peopleOverview: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees: totalEmployees - activeEmployees,
          totalTeams,
        },
        workOverview: {
          totalProjects,
          totalTasks,
          completedTasks,
          pendingTasks: totalTasks - completedTasks,
          projectStatusDistribution,
          taskStatusDistribution,
        },
        scoreSummary: {
          period,
          measOverall: {
            totalRecords: measOverall._count._all,
            avgScore: measOverall._avg.score ?? 0,
            minScore: measOverall._min.score ?? 0,
            maxScore: measOverall._max.score ?? 0,
          },
          measCurrentMonth: {
            totalRecords: measCurrent._count._all,
            avgScore: measCurrent._avg.score ?? 0,
            minScore: measCurrent._min.score ?? 0,
            maxScore: measCurrent._max.score ?? 0,
          },
          biasOverall: {
            totalRecords: biasOverall._count._all,
            avgScore: biasOverall._avg.biasScore ?? 0,
            minScore: biasOverall._min.biasScore ?? 0,
            maxScore: biasOverall._max.biasScore ?? 0,
          },
          biasCurrentMonth: {
            totalRecords: biasCurrent._count._all,
            avgScore: biasCurrent._avg.biasScore ?? 0,
            minScore: biasCurrent._min.biasScore ?? 0,
            maxScore: biasCurrent._max.biasScore ?? 0,
          },
          epsOverall: {
            totalRecords: epsOverall._count._all,
            avgScore: epsOverall._avg.score ?? 0,
            minScore: epsOverall._min.score ?? 0,
            maxScore: epsOverall._max.score ?? 0,
          },
          epsCurrentMonth: {
            totalRecords: epsCurrent._count._all,
            avgScore: epsCurrent._avg.score ?? 0,
            minScore: epsCurrent._min.score ?? 0,
            maxScore: epsCurrent._max.score ?? 0,
          },
        },
        rankings: {
          topManagersCurrent,
          topEmployeesCurrent,
        },
      },
    });
  } catch (error) {
    console.error("Error in departmentManagerDashBoard:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

