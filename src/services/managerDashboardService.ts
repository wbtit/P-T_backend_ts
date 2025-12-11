import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { calculateManagerEstimationScore } from "./managerEstimationService";
import { getMEASTrendline } from "./measTrendService";
import { calculateManagerBias } from "./biasDetector";

export async function getManagerDashboardData(managerId: string, projectId: string) {
    const now = new Date();

    // 1️⃣ MEAS Score (current month)
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const measScore = await calculateManagerEstimationScore(
        managerId,
        projectId
    );

    // 2️⃣ Trendline (last 6 months)
    const trendline = await getMEASTrendline(managerId, projectId);

    // 3️⃣ Bias Score
    const biasResult = await calculateManagerBias(managerId, projectId);

    // 4️⃣ Overrun & Underutilization metrics
    const tasks = await prisma.task.findMany({
        where: {
            project_id: projectId,
            project: { managerID: managerId },
            status: "COMPLETED"
        },
        include: {
            allocationLog: true,
            workingHourTask: true
        }
    });

    let overrun = 0;
    let underutilized = 0;
    let totalEvaluatedTasks = 0;

    const nowFallback = new Date();

    for (const task of tasks) {
        const allocated = Number(task.allocationLog?.allocatedHours ?? 0);
        if (!allocated) continue;

        let totalSeconds = 0;

        for (const segment of task.workingHourTask) {
            const end = segment.ended_at ?? nowFallback;
            const duration =
                segment.duration_seconds ??
                secondsBetween(segment.started_at, end);

            totalSeconds += duration;
        }

        const actual = totalSeconds / 3600; // hours
        totalEvaluatedTasks++;

        if (actual > allocated) overrun++;
        if (actual < allocated * 0.6) underutilized++;
    }

    const overrunPercent =
        totalEvaluatedTasks === 0
            ? 0
            : Number(((overrun / totalEvaluatedTasks) * 100).toFixed(2));

    const underutilizedPercent =
        totalEvaluatedTasks === 0
            ? 0
            : Number(((underutilized / totalEvaluatedTasks) * 100).toFixed(2));

    // 5️⃣ Task stats summary
    const summaryCounts = await prisma.task.groupBy({
        by: ["status"],
        where: {
            project_id: projectId,
            project: { managerID: managerId }
        },
        _count: { id: true }
    });

    // 6️⃣ Generate Insights
    const measInsight =
        measScore.score >= 85
            ? "Excellent estimation accuracy"
            : measScore.score >= 70
            ? "Good, but can improve"
            : measScore.score >= 50
            ? "Poor accuracy – needs attention"
            : "Critical estimation issues";

    const biasInsight =
        biasResult.interpretation === "UNDER_ESTIMATING"
            ? "Consistently allocates less time than needed – employee overload risk"
            : biasResult.interpretation === "OVER_ESTIMATING"
            ? "Consistently allocates more time than needed – inefficiency risk"
            : "Balanced estimation pattern";

    return {
        managerId,
        projectId,

        measScore,
        measInsight,

        trendline,

        biasScore: biasResult.bias,
        biasInterpretation: biasResult.interpretation,
        biasInsight,

        overrunPercent,
        underutilizedPercent,

        taskSummary: summaryCounts,

        generatedAt: new Date()
    };
}
