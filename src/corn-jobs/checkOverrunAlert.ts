import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { getActiveUserIdsByRoles, notifyUsers } from "../utils/notifyByRole";
import { parseHHMMToHours } from "../utils/timeFormat";

export async function checkOverrunAlert() {
    const now = new Date();
    const recipientIds = await getActiveUserIdsByRoles([
        "ADMIN",
        "DEPUTY_MANAGER",
        "OPERATION_EXECUTIVE",
    ]);

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
        const allocatedHours = parseHHMMToHours(task.allocationLog?.allocatedHours);
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

            // Notification matrix (2.6): notify ADM + DEP + OE
            const payload = {
                type: "TASK_OVERRUN_100",
                title: "Task Overrun",
                message: `Task '${task.name}' exceeded allocated time. Used ${percentUsed}% (${workedHours} hrs).`,
                taskId: task.id,
                employeeId: task.user_id,
                allocatedHours,
                workedHours,
                percentUsed,
                timestamp: new Date()
            };

            await notifyUsers(recipientIds, payload);

            console.log(`⚠️ 100% Overrun Alert Triggered for Task ${task.id}`);
        }
    }
}

       
