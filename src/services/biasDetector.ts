import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { parseHHMMToHours } from "../utils/timeFormat";

export async function calculateManagerBias(managerId: string, projectId?: string) {
    const now = new Date();

    const tasks = await prisma.task.findMany({
        where: {
            project: { managerID: managerId },
            ...(projectId ? { projectId } : {}),
            status: "COMPLETED",
        },
        include: {
            allocationLog: true,
            workingHourTask: true,
        },
    });

    if (tasks.length === 0) {
        return {
            managerId,
            projectId,
            bias: 0,
            interpretation: "NO_DATA",
        };
    }

    let biasValues: number[] = [];

    for (const task of tasks) {
        const allocated = parseHHMMToHours(task.allocationLog?.allocatedHours);
        if (!allocated) continue;

        let totalSeconds = 0;

        for (const segment of task.workingHourTask) {
            const end = segment.ended_at ?? now;
            const duration =
                segment.duration_seconds ??
                secondsBetween(segment.started_at, end);

            totalSeconds += duration;
        }

        const actual = totalSeconds / 3600; // hours
        const bias = (actual - allocated) / allocated;

        biasValues.push(bias);
    }

    if (biasValues.length === 0) {
        return {
            managerId,
            projectId,
            bias: 0,
            interpretation: "NO_VALID_TASKS",
        };
    }

    const avgBias = biasValues.reduce((a, b) => a + b, 0) / biasValues.length;

    // Interpretation
    let interpretation = "";

    if (avgBias > 0.20) interpretation = "UNDER_ESTIMATING";
    else if (avgBias < -0.20) interpretation = "OVER_ESTIMATING";
    else interpretation = "BALANCED";

    return {
        managerId,
        projectId,
        bias: Number(avgBias.toFixed(3)),
        interpretation,
    };
}
