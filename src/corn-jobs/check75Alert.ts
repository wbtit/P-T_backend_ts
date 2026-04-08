import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { notifyProjectStakeholdersByRole } from "../utils/notifyProjectStakeholders";
import { sendNotification } from "../utils/sendNotification";
import { parseHHMMToHours } from "../utils/timeFormat";

export async function check75Alert() {
    const now = new Date();

    // Find active tasks where 75% alert has NOT been triggered
    const tasks = await prisma.task.findMany({
        where: {
            status: { in: ["IN_PROGRESS", "BREAK"] },
            seventyFiveAlertSent: false,
        },
        include: {
            allocationLog: true,
            workingHourTask: true,
            project: { 
                select: { 
                    managerID: true, 
                    name: true,
                    departmentID: true,
                } 
            },
        },
    });

    for (const task of tasks) {
        const allocatedHours = parseHHMMToHours(task.allocationLog?.allocatedHours);
        if (!allocatedHours) continue;

        const allocatedSeconds = allocatedHours * 3600;
        const threshold75 = allocatedSeconds * 0.75;

        //Calculate total worked seconds (WORK + REWORK)
        let totalSeconds = 0;

        for (const segment of task.workingHourTask) {
            const end = segment.ended_at ?? now;
            const duration =
                segment.duration_seconds ??
                secondsBetween(segment.started_at, end);

            totalSeconds += duration;
        }

        //If 75% threshold reached
        if (totalSeconds >= threshold75) {
            //  Mark alert as triggered
            await prisma.task.update({
                where: { id: task.id },
                data: { seventyFiveAlertSent: true },
            });

            //Create DB audit log
            await prisma.taskAlert.create({
                data: {
                    taskId: task.id,
                    userId: task.user_id,
                    type: "APPROACHING_75_PERCENT",
                    meta: {
                        allocatedHours,
                        workedHours: (totalSeconds / 3600).toFixed(2),
                        percentUsed: (
                            (totalSeconds / allocatedSeconds) * 100
                        ).toFixed(2),
                    },
                },
            });

            // Create flag (optional)
            await prisma.taskFlag.create({
                data: {
                    taskId: task.id,
                    userId: task.user_id,
                    type: "FREQUENT_75_PERCENT_ALERTS",
                    severity: 1,
                    reason: "Task has used over 75% of allocated hours",
                },
            });

            // ─────────────────────────────────────────────
            // SEND REAL-TIME NOTIFICATIONS (WEBSOCKET + DB)
            // ─────────────────────────────────────────────

            const workedHours = (totalSeconds / 3600).toFixed(2);
            const percentUsed = (
                (totalSeconds / allocatedSeconds) * 100
            ).toFixed(2);

            // Notification matrix (2.5): notify ADM + DEP + OE
            const notifyPayload = {
                type: "TASK_75_PERCENT",
                title: "Task reached 75% allocated hours",
                message: `Task '${task.name}' has reached ${percentUsed}% of allocated hours.`,
                taskId: task.id,
                projectId: task.project_id,
                projectName: task.project?.name,
                employeeId: task.user_id,
                allocatedHours,
                workedHours,
                percentUsed,
                timestamp: new Date(),
            };

            // Notify project-scoped roles (ADMIN, DEPUTY_MANAGER, OE)
            await notifyProjectStakeholdersByRole(
                task.project_id,
                ["ADMIN", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE"],
                () => notifyPayload,
            );

            // Notify the task assignee directly (STAFF - matrix 2.5)
            if (task.user_id) {
                await sendNotification(task.user_id, notifyPayload);
            }

            console.log(`75% alert triggered for task ${task.id}`);
        }
    }
}
