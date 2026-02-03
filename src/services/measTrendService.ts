import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { parseHHMMToHours } from "../utils/timeFormat";

async function calculateMEASForMonth(managerId: string, projectId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const tasks = await prisma.task.findMany({
        where: {
            project_id: projectId,
            project: { managerID: managerId },
            status: "COMPLETED",
            updatedAt: { gte: startDate, lt: endDate }
        },
        include: {
            allocationLog: true,
            workingHourTask: true
        }
    });

    if (tasks.length === 0) return 100; // Default when no tasks exist.

    const now = new Date();
    let scores: number[] = [];

    for (const task of tasks) {
        const allocated = parseHHMMToHours(task?.allocationLog?.allocatedHours);
        if (allocated <= 0) continue;

        let totalSeconds = 0;

        for (const segment of task.workingHourTask) {
            const end = segment.ended_at ?? now;
            const duration =
                segment.duration_seconds ??
                secondsBetween(segment.started_at, end);

            totalSeconds += duration;
        }

        const actual = totalSeconds / 3600; 
        const deviation = Math.abs(actual - allocated) / allocated;

        let accuracy = 100 - deviation * 100;
        if (accuracy < 0) accuracy = 0;

        scores.push(accuracy);
    }

    return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
}

export async function getMEASTrendline(managerId: string, projectId: string) {
    const now = new Date();
    const trend: { period: string; score: number }[] = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const period = `${year}-${String(month).padStart(2, "0")}`;

        const score = await calculateMEASForMonth(
            managerId,
            projectId,
            year,
            month
        );

        trend.push({ period, score });
    }

    return trend;
}
