import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { parseHHMMToHours } from "../utils/timeFormat";

/**
 * We compute EPS from six pillars:
 * 1) completionScore (25%)
 * 2) overrunScore (20%)
 * 3) underutilizedScore (10%)
 * 4) reworkScore (20%)
 * 5) disciplineScore (15%)
 * 6) sessionQualityScore (10%)
 *
 * All scores are 0-100; EPS is weighted sum.
 */

type EPSResult = {
  employeeId: string;
  period: string; // YYYY-MM
  components: {
    completionScore: number;
    overrunScore: number;
    underutilizedScore: number;
    reworkScore: number;
    disciplineScore: number;
    sessionQualityScore: number;
  };
  score: number;
};

function safePercent(n: number) {
  if (!Number.isFinite(n) || isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Number(n.toFixed(2));
}

export async function calculateEPSForEmployee(employeeId: string, year: number, month: number): Promise<EPSResult> {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const now = new Date();

  // ------------- gather tasks assigned/completed in the period -------------
  // Assigned tasks = tasks where user_id == employeeId and created_on in period OR updated in the period?
  // We'll use tasks that were either created or completed in the period for fairness.
  const tasks = await prisma.task.findMany({
    where: {
      user_id: employeeId,
      OR: [
        { created_on: { gte: startDate, lt: endDate } },
        { updatedAt: { gte: startDate, lt: endDate } }, // includes completed or updates
        { status: "COMPLETED", updatedAt: { gte: startDate, lt: endDate } }
      ],
    },
    include: {
      allocationLog: true,
      workingHourTask: true,
    },
  });

  // If no tasks at all, return default 100
  if (!tasks || tasks.length === 0) {
    const defaultResult: EPSResult = {
      employeeId,
      period,
      components: {
        completionScore: 100,
        overrunScore: 100,
        underutilizedScore: 100,
        reworkScore: 100,
        disciplineScore: 100,
        sessionQualityScore: 100,
      },
      score: 100,
    };
    // optionally upsert record here if you want
    return defaultResult;
  }

  // ---------- 1) Completion Score (25%) ----------
  // completionScore = percentage of tasks completed in period / assignedTasks
  const assignedTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED" && t.updatedAt >= startDate && t.updatedAt < endDate).length;
  const completionRatio = assignedTasks === 0 ? 1 : (completedTasks / assignedTasks);
  const completionScore = safePercent(completionRatio * 100); // 0-100

  // ---------- Helpers to compute actual hours per task ----------
  function computeActualHoursForTask(task: any) {
    let totalSeconds = 0;
    for (const seg of task.workingHourTask || []) {
      const end = seg.ended_at ?? now;
      const duration = seg.duration_seconds ?? secondsBetween(seg.started_at, end);
      totalSeconds += duration;
    }
    return totalSeconds / 3600; // hours
  }

  // ---------- 2) Overrun Score (20%) ----------
  // overrunPercent = tasks where actual > allocated / evaluatedTasks
  let overrunCount = 0;
  let underutilizedCount = 0;
  let reworkCount = 0;
  let disciplineFlagsCount = 0;
  let idlePenaltySum = 0; // for session quality
  let evaluatedTasks = 0;

  for (const task of tasks) {
    const allocated = parseHHMMToHours(task.allocationLog?.allocatedHours);
    // ignore tasks without allocated hours for overrun/underutilization stats
    const actual = computeActualHoursForTask(task);
    if (allocated > 0) {
      evaluatedTasks++;
      if (actual > allocated) overrunCount++;
      if (actual < allocated * 0.6) underutilizedCount++;
    }

    // rework count: how many REWORK segments exist in task
    const reworkSegments = (task.workingHourTask || []).filter((s: any) => s.type === "REWORK").length;
    if (reworkSegments > 0) reworkCount++;

    // discipline flags: count auto-close and other flags for this task
    const flags = await prisma.taskFlag.findMany({ where: { taskId: task.id, userId: employeeId } });
    // sum flags that indicate discipline issues (you can refine types)
    for (const f of flags) {
      if (["USER_FORGOT_TO_END", "USER_OVERRAN_ALLOCATION"].includes(f.type)) {
        disciplineFlagsCount++;
      }
    }

    // Session quality: compute idle percentage approximation:
    // Idle = total wall-clock span for task between first start and last end minus active seconds
    const segments = (task.workingHourTask || []).slice().sort((a: any, b: any) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    if (segments.length >= 1) {
      const firstStart = new Date(segments[0].started_at);
      const lastSegmentEndedAt = segments[segments.length - 1].ended_at;
      const lastEnd = lastSegmentEndedAt ? new Date(lastSegmentEndedAt) : now;
      const wallMs = lastEnd.getTime() - firstStart.getTime();
      let activeMs = 0;
      for (const s of segments) {
        const sEnd = s.ended_at ? new Date(s.ended_at) : now;
        const sStart = new Date(s.started_at);
        activeMs += Math.max(0, sEnd.getTime() - sStart.getTime());
      }
      const idleMs = Math.max(0, wallMs - activeMs);
      const idlePct = wallMs === 0 ? 0 : (idleMs / wallMs);
      idlePenaltySum += idlePct; // accumulate for averaging
    }
  }

  // Overrun score: higher overrunCount => lower score
  const overrunPercent = evaluatedTasks === 0 ? 0 : (overrunCount / evaluatedTasks);
  const overrunScore = safePercent(100 - overrunPercent * 100); // 0..100

  // Underutilized score
  const underutilizedPercent = evaluatedTasks === 0 ? 0 : (underutilizedCount / evaluatedTasks);
  const underutilizedScore = safePercent(100 - underutilizedPercent * 100);

  // Rework score (20%)
  const reworkPercent = tasks.length === 0 ? 0 : (reworkCount / tasks.length);
  const reworkScore = safePercent(100 - reworkPercent * 100);

  // Discipline score (15%)
  // simple penalty model: each flag reduces some percent (tunable)
  const flagPenalty = 5; // each critical flag reduces 5%
  const disciplineScoreUncapped = 100 - (disciplineFlagsCount * flagPenalty);
  const disciplineScore = safePercent(disciplineScoreUncapped);

  // Session quality score (10%) - lower when idlePct high
  const avgIdlePct = tasks.length === 0 ? 0 : (idlePenaltySum / tasks.length); // average 0..1
  const sessionQualityScore = safePercent(100 - avgIdlePct * 100);

  // Compose final EPS with weights:
  const finalScore =
    completionScore * 0.25 +
    overrunScore * 0.20 +
    underutilizedScore * 0.10 +
    reworkScore * 0.20 +
    disciplineScore * 0.15 +
    sessionQualityScore * 0.10;

  const epsResult: EPSResult = {
    employeeId,
    period,
    components: {
      completionScore: safePercent(completionScore),
      overrunScore: safePercent(overrunScore),
      underutilizedScore: safePercent(underutilizedScore),
      reworkScore: safePercent(reworkScore),
      disciplineScore: safePercent(disciplineScore),
      sessionQualityScore: safePercent(sessionQualityScore),
    },
    score: safePercent(finalScore),
  };

  // Store (upsert) result into DB table if you created it
  try {
    await prisma.employeePerformanceScore.upsert({
      where: { employeeId_period: { employeeId, period } as any },
      create: {
        employeeId,
        period,
        score: epsResult.score,
      },
      update: {
        score: epsResult.score,
        calculatedAt: new Date(),
      },
    });
  } catch (err:any) {
    // if table doesn't exist or upsert fails, don't blow up — return result anyway
    console.warn("Warning: failed to persist EPS result (maybe migration not run):", err.message ?? err);
  }

  return epsResult;
}
