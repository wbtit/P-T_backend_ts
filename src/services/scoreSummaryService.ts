import prisma from "../config/database/client";

type ScoreRow = {
  period: string;
  score: number;
};

type ScoreSummary = {
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  latest: {
    period: string | null;
    avg: number | null;
  };
};

type ScoreScopes = {
  perProject: ScoreSummary | null;
  specificPeriod: ScoreSummary | null;
  allTime: ScoreSummary;
};

export type ScoresSummaryResult = {
  context: {
    projectId: string | null;
    period: string | null;
    projectEmployeeCount: number;
    projectTeamCount: number;
  };
  meas: ScoreScopes;
  eps: ScoreScopes;
  tes: ScoreScopes;
};

function toFixedOrNull(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(2));
}

function summarizeScoreRows(rows: ScoreRow[]): ScoreSummary {
  if (rows.length === 0) {
    return {
      count: 0,
      avg: null,
      min: null,
      max: null,
      latest: {
        period: null,
        avg: null,
      },
    };
  }

  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    sum += row.score;
    if (row.score < min) min = row.score;
    if (row.score > max) max = row.score;
  }

  const latestPeriod = rows.reduce((current, row) =>
    row.period > current ? row.period : current
  , rows[0].period);
  const latestRows = rows.filter((r) => r.period === latestPeriod);
  const latestAvg =
    latestRows.reduce((acc, r) => acc + r.score, 0) / latestRows.length;

  return {
    count: rows.length,
    avg: toFixedOrNull(sum / rows.length),
    min: toFixedOrNull(min),
    max: toFixedOrNull(max),
    latest: {
      period: latestPeriod,
      avg: toFixedOrNull(latestAvg),
    },
  };
}

function buildScopeSummary(
  allRows: ScoreRow[],
  period: string | null,
  perProjectRows: ScoreRow[] | null
): ScoreScopes {
  const specificPeriodSource = perProjectRows ?? allRows;
  return {
    perProject: perProjectRows ? summarizeScoreRows(perProjectRows) : null,
    specificPeriod: period
      ? summarizeScoreRows(
          specificPeriodSource.filter((r) => r.period === period)
        )
      : null,
    allTime: summarizeScoreRows(allRows),
  };
}

export async function getScoresSummary(
  projectId?: string,
  year?: number,
  month?: number
): Promise<ScoresSummaryResult> {
  const period =
    Number.isInteger(year) && Number.isInteger(month)
      ? `${year}-${String(month).padStart(2, "0")}`
      : null;

  const [globalMeasRows, globalEpsRows, globalTesRows] = await Promise.all([
    prisma.managerEstimationScore.findMany({
      select: { period: true, score: true },
    }),
    prisma.employeePerformanceScore.findMany({
      select: { period: true, score: true },
    }),
    prisma.teamEfficiencyScore.findMany({
      select: { period: true, score: true },
    }),
  ]);

  let projectMeasRows: ScoreRow[] | null = null;
  let projectEpsRows: ScoreRow[] | null = null;
  let projectTesRows: ScoreRow[] | null = null;
  let projectEmployeeIds: string[] = [];
  let projectTeamIds: string[] = [];

  if (projectId) {
    const [measRows, taskUsers, projectTeams] = await Promise.all([
      prisma.managerEstimationScore.findMany({
        where: { projectId },
        select: { period: true, score: true },
      }),
      prisma.task.findMany({
        where: { project_id: projectId },
        select: { user_id: true },
      }),
      prisma.team.findMany({
        where: {
          project: {
            some: { id: projectId },
          },
        },
        select: { id: true },
      }),
    ]);

    projectMeasRows = measRows;
    projectEmployeeIds = Array.from(
      new Set(taskUsers.map((u) => u.user_id).filter(Boolean))
    );
    projectTeamIds = projectTeams.map((t) => t.id);

    if (projectEmployeeIds.length > 0) {
      projectEpsRows = await prisma.employeePerformanceScore.findMany({
        where: {
          employeeId: { in: projectEmployeeIds },
        },
        select: { period: true, score: true },
      });
    } else {
      projectEpsRows = [];
    }

    if (projectTeamIds.length > 0) {
      projectTesRows = await prisma.teamEfficiencyScore.findMany({
        where: {
          teamId: { in: projectTeamIds },
        },
        select: { period: true, score: true },
      });
    } else {
      projectTesRows = [];
    }
  }

  return {
    context: {
      projectId: projectId ?? null,
      period,
      projectEmployeeCount: projectEmployeeIds.length,
      projectTeamCount: projectTeamIds.length,
    },
    meas: buildScopeSummary(globalMeasRows, period, projectMeasRows),
    eps: buildScopeSummary(globalEpsRows, period, projectEpsRows),
    tes: buildScopeSummary(globalTesRows, period, projectTesRows),
  };
}
