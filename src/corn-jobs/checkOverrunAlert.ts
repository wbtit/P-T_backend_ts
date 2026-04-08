import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { notifyProjectStakeholdersByRole } from "../utils/notifyProjectStakeholders";
import { sendNotification } from "../utils/sendNotification";
import { parseHHMMToHours } from "../utils/timeFormat";

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
            project: { 
                select: { 
                    managerID: true, 
                    name: true,
                    departmentID: true,
                } 
            }
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
            const overrunPayload = {
                type: "TASK_OVERRUN_100",
                title: "Task Overrun",
                message: `Task '${task.name}' has exceeded its allocated hours (${percentUsed}% used).`,
                taskId: task.id,
                projectId: task.project_id,
                projectName: task.project?.name,
                employeeId: task.user_id,
                allocatedHours,
                workedHours,
                percentUsed,
                timestamp: new Date(),
            };

            // Notify project-scoped roles per matrix (2.6)
            await notifyProjectStakeholdersByRole(
                task.project_id,
                ["ADMIN", "DEPT_MANAGER", "PROJECT_MANAGER", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE"],
                () => overrunPayload,
            );

            // Notify the task assignee directly (STAFF - matrix 2.6)
            if (task.user_id) {
                await sendNotification(task.user_id, overrunPayload);
            }

            console.log(`⚠️ 100% Overrun Alert Triggered for Task ${task.id}`);
        }
    }
}

       
