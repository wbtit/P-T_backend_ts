import { randomUUID } from "crypto";
import prisma from "../config/database/client";
import { AppError } from "../config/utils/AppError";

type TeamEfficiencyResult = {
  teamId: string;
  teamName: string;
  managerId: string;
  period: string;
  formulaVariant: "WITH_MEAS" | "WITHOUT_MEAS";
  components: {
    avgEps: number;
    measScore: number | null;
    onTimeCompletion: number;
    throughput: number;
    reworkRate: number;
    reworkScore: number;
  };
  score: number;
  persisted: boolean;
};

const toPercent = (value: number): number => {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Number(value.toFixed(2));
};

export async function calculateTeamEfficiencyForTeam(
  teamId: string,
  year: number,
  month: number
): Promise<TeamEfficiencyResult> {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        select: {
          userId: true,
        },
      },
      project: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!team || team.isDeleted) {
    throw new AppError("Team not found", 404);
  }

  const memberIds = Array.from(new Set(team.members.map((m) => m.userId)));

  if (memberIds.length === 0) {
    throw new AppError(`Team ${team.name} has no members`, 404);
  }

  const epsAggregate = await prisma.employeePerformanceScore.aggregate({
    where: {
      employeeId: { in: memberIds },
      period,
    },
    _avg: {
      score: true,
    },
  });

  const avgEps = toPercent(epsAggregate._avg.score ?? 0);

  const tasks = await prisma.task.findMany({
    where: {
      user_id: { in: memberIds },
      OR: [
        { created_on: { gte: startDate, lt: endDate } },
        { updatedAt: { gte: startDate, lt: endDate } },
      ],
    },
    select: {
      id: true,
      status: true,
      created_on: true,
      updatedAt: true,
      due_date: true,
      workingHourTask: {
        select: {
          type: true,
        },
      },
    },
  });

  const assignedTasks = tasks.filter(
    (t) => t.created_on >= startDate && t.created_on < endDate
  );

  const completedTasksInPeriod = tasks.filter(
    (t) =>
      t.status === "COMPLETED" &&
      t.updatedAt >= startDate &&
      t.updatedAt < endDate
  );

  const onTimeCompletedCount = completedTasksInPeriod.filter(
    (t) => t.updatedAt <= t.due_date
  ).length;

  const onTimeCompletion = toPercent(
    completedTasksInPeriod.length === 0
      ? 0
      : (onTimeCompletedCount / completedTasksInPeriod.length) * 100
  );

  const throughput = toPercent(
    assignedTasks.length === 0
      ? 0
      : (completedTasksInPeriod.length / assignedTasks.length) * 100
  );

  const reworkTaskCount = completedTasksInPeriod.filter((t) =>
    t.workingHourTask.some((seg) => seg.type === "REWORK")
  ).length;

  const reworkRate = toPercent(
    completedTasksInPeriod.length === 0
      ? 0
      : (reworkTaskCount / completedTasksInPeriod.length) * 100
  );
  const reworkScore = toPercent(100 - reworkRate);

  const projectIds = team.project.map((p) => p.id);
  let measScore: number | null = null;

  if (projectIds.length > 0) {
    const measAggregate = await prisma.managerEstimationScore.aggregate({
      where: {
        managerId: team.managerID,
        projectId: { in: projectIds },
        period,
      },
      _avg: {
        score: true,
      },
    });

    if (measAggregate._avg.score !== null) {
      measScore = toPercent(measAggregate._avg.score);
    }
  }

  const formulaVariant = measScore !== null ? "WITH_MEAS" : "WITHOUT_MEAS";

  const finalScore =
    formulaVariant === "WITH_MEAS"
      ? toPercent(
          avgEps * 0.35 +
            (measScore as number) * 0.2 +
            onTimeCompletion * 0.2 +
            throughput * 0.15 +
            reworkScore * 0.1
        )
      : toPercent(
          avgEps * 0.4 +
            onTimeCompletion * 0.25 +
            throughput * 0.2 +
            reworkScore * 0.15
        );

  let persisted = false;
  try {
    await prisma.$executeRaw`
      INSERT INTO "team_efficiency_score"
      (
        "id",
        "team_id",
        "period",
        "score",
        "avg_eps",
        "meas_score",
        "on_time_completion",
        "throughput",
        "rework_rate",
        "rework_score",
        "calculated_at"
      )
      VALUES
      (
        ${randomUUID()}::uuid,
        ${team.id}::uuid,
        ${period},
        ${finalScore},
        ${avgEps},
        ${measScore},
        ${onTimeCompletion},
        ${throughput},
        ${reworkRate},
        ${reworkScore},
        NOW()
      )
      ON CONFLICT ("team_id", "period")
      DO UPDATE SET
        "score" = EXCLUDED."score",
        "avg_eps" = EXCLUDED."avg_eps",
        "meas_score" = EXCLUDED."meas_score",
        "on_time_completion" = EXCLUDED."on_time_completion",
        "throughput" = EXCLUDED."throughput",
        "rework_rate" = EXCLUDED."rework_rate",
        "rework_score" = EXCLUDED."rework_score",
        "calculated_at" = NOW();
    `;
    persisted = true;
  } catch (err: any) {
    console.warn(
      "Warning: failed to persist TES result (maybe migration not run):",
      err?.message ?? err
    );
  }

  return {
    teamId: team.id,
    teamName: team.name,
    managerId: team.managerID,
    period,
    formulaVariant,
    components: {
      avgEps,
      measScore,
      onTimeCompletion,
      throughput,
      reworkRate,
      reworkScore,
    },
    score: finalScore,
    persisted,
  };
}
