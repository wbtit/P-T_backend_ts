import corn from "node-cron";
import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";

const MAX_SESSION_HOURS = 14; // Choose 8–12 hours depending on policy
const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;

export async function autoCloseStaleTasks() {
    const now = new Date();

    // Find tasks that have been running >14 hours and no warning sent yet
    const staleTasks = await prisma.task.findMany({
        where: {
            status: { in: ["IN_PROGRESS", "BREAK"] },
            autoCloseWarningSent: false,
        },
        include: {
            project: { select: { managerID: true, name: true } }
        }
    });

    if (staleTasks.length === 0) return;

    // Import sendNotification dynamically to avoid circular import
    const { sendNotification } = await import("../utils/sendNotification");

    const taskIds = staleTasks.map(t => t.id);

    // Batch fetch the earliest working hour session for all tasks in one query
    const firstSessions = await prisma.workingHours.findMany({
        where: { task_id: { in: taskIds } },
        orderBy: { started_at: "asc" },
        distinct: ["task_id"],
    });

    const firstSessionMap = new Map(firstSessions.map(s => [s.task_id, s]));

    for (const task of staleTasks) {
        const firstSession = firstSessionMap.get(task.id);

        if (!firstSession) continue;

        const taskStart = firstSession.started_at;
        const elapsedMs = now.getTime() - taskStart.getTime();

        if (elapsedMs > MAX_SESSION_MS) {
            // Send warning notification with actions
            const warningPayload = {
                type: "TASK_AUTO_CLOSE_WARNING",
                title: "Task Session Expiring Soon",
                message: `Your task session has exceeded 14 hours. It will be automatically closed in 1 hour if no action is taken.`,
                taskId: task.id,
                actions: [
                    {
                        label: "End Task Now",
                        action: "end_task",
                        endpoint: "/working-hours/auto-close-action"
                    },
                    {
                        label: "Request More Hours",
                        action: "request_more_hours",
                        endpoint: "/working-hours/auto-close-action"
                    }
                ],
                timestamp: new Date()
            };

            await sendNotification(task.user_id, warningPayload);

            // Mark warning as sent
            await prisma.task.update({
                where: { id: task.id },
                data: {
                    autoCloseWarningSent: true,
                    autoCloseWarningSentAt: now
                }
            });

            console.log(`⚠️ Auto-close warning sent for Task ${task.id}`);
        }
    }
}

// Separate function for force closing after grace period
export async function forceCloseStaleTasks() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    // Find tasks with warning sent >1 hour ago and no action taken
    const tasksToForceClose = await prisma.task.findMany({
        where: {
            status: { in: ["IN_PROGRESS", "BREAK"] },
            autoCloseWarningSent: true,
            autoCloseWarningSentAt: { lt: oneHourAgo },
            autoCloseActionTaken: false,
        },
        include: {
            project: { select: { managerID: true, name: true } }
        }
    });

    if (tasksToForceClose.length === 0) return;

    const forceTaskIds = tasksToForceClose.map(t => t.id);

    // Batch fetch all active sessions in one query
    const activeSessions = await prisma.workingHours.findMany({
        where: {
            task_id: { in: forceTaskIds },
            ended_at: null
        }
    });

    const activeSessionMap = new Map(activeSessions.map(s => [s.task_id, s]));

    // Batch fetch all first sessions
    const forceFirstSessions = await prisma.workingHours.findMany({
        where: { task_id: { in: forceTaskIds } },
        orderBy: { started_at: "asc" },
        distinct: ["task_id"],
    });

    const forceFirstSessionMap = new Map(forceFirstSessions.map(s => [s.task_id, s]));

    for (const task of tasksToForceClose) {
        const activeSession = activeSessionMap.get(task.id);

        if (!activeSession) continue;

        const forcedEnd = now;
        const duration = secondsBetween(activeSession.started_at, forcedEnd);

        // Close the session
        await prisma.workingHours.update({
            where: { id: activeSession.id },
            data: {
                ended_at: forcedEnd,
                duration_seconds: duration,
            }
        });

        await prisma.task.update({
            where: { id: task.id },
            data: {
                status: "IN_REVIEW",
            }
        });

        // Create flag and alert
        await prisma.taskFlag.create({
            data: {
                taskId: task.id,
                userId: task.user_id,
                type: "USER_FORGOT_TO_END",
                severity: 3,
                reason: "Task exceeded maximum allowed working window - auto-closed after grace period"
            }
        });

        const firstSession = forceFirstSessionMap.get(task.id);

        await prisma.taskAlert.create({
            data: {
                taskId: task.id,
                userId: task.user_id,
                type: "AUTO_END_APPLIED",
                meta: {
                    startedAt: firstSession?.started_at,
                    exceededHours: (now.getTime() - (firstSession?.started_at?.getTime() || 0)) / 3600000
                }
            }
        });

        console.log(`🚫 Force-closed stale task ${task.id}`);
    }
}
