import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { sendNotification } from "../utils/sendNotification";

export async function checkOverrunAlert() {
    const now = new Date();

    // Get tasks IN PROGRESS that have NOT triggered overrun alert
    const tasks = await prisma.task.findMany({
        where: {
            status: { in: ["IN_PROGRESS", "BREAK", "REWORK"] },
            overrunAlertSent: false,
        },
        include: {
            allocationLog: true,
            workingHourTask: true,
            project: { select: { managerID: true, name: true } }
        }
    });

    for (const task of tasks) {
        const allocatedHours = Number(task.allocationLog?.allocatedHours ?? 0);
        if (!allocatedHours) continue;

        const allocatedSeconds = allocatedHours * 3600;

        // Calculate actual worked time
        let totalSeconds = 0;

        for (const segment of task.workingHourTask) {
            const end = segment.ended_at ?? now;
            const duration =
                segment.duration_seconds ??
                secondsBetween(segment.started_at, end);

            totalSeconds += duration;
        }

        // OVER 100%?
        if (totalSeconds >= allocatedSeconds) {

            const workedHours = (totalSeconds / 3600).toFixed(2);
            const percentUsed = ((totalSeconds / allocatedSeconds) * 100).toFixed(2);

            // 1️⃣ Mark flag so this alert never repeats
            await prisma.task.update({
                where: { id: task.id },
                data: { overrunAlertSent: true }
            });

            // 2️⃣ Create TaskAlert (for auditing)
            await prisma.taskAlert.create({
                data: {
                    taskId: task.id,
                    userId: task.user_id,
                    type: "OVER_TIME_EXCEEDED",
                    meta: {
                        allocatedHours,
                        workedHours,
                        percentUsed,
                    }
                }
            });

            // 3️⃣ Create a flag for reporting
            await prisma.taskFlag.create({
                data: {
                    taskId: task.id,
                    userId: task.user_id,
                    type: "USER_OVERRAN_ALLOCATION",
                    severity: 2,
                    reason: "Task exceeded allocated hours"
                }
            });

            // 4️⃣ Create real-time notifications

            const userPayload = {
                type: "TASK_OVERRUN_100",
                title: "Task Time Exceeded",
                message: `You exceeded the allocated ${allocatedHours} hours for task '${task.name}'. Worked: ${workedHours} hrs.`,
                taskId: task.id,
                allocatedHours,
                workedHours,
                percentUsed,
                timestamp: new Date()
            };

            const managerPayload = {
                type: "TASK_OVERRUN_100_MANAGER",
                title: "Task Overrun",
                message: `Task '${task.name}' assigned to your team exceeded allocated time. Used ${percentUsed}% (${workedHours} hrs).`,
                taskId: task.id,
                employeeId: task.user_id,
                allocatedHours,
                workedHours,
                percentUsed,
                timestamp: new Date()
            };

            // Send notifications
            await sendNotification(task.user_id, userPayload);

            if (task.project.managerID) {
                await sendNotification(task.project.managerID, managerPayload);
            }

            console.log(`⚠️ 100% Overrun Alert Triggered for Task ${task.id}`);
        }
    }
}

       