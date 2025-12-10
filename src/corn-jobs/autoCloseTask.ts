import corn from "node-cron";
import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";


const MAX_SESSION_HOURS = 14; // Choose 8–12 hours depending on policy
const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;






 export async function autoCloseStaleTasks() {
    const now = new Date();

    const staleTasks = await prisma.task.findMany({
        where:{
            status:{in:["IN_PROGRESS","BREAK"]},
        }
    });
    for(const task of staleTasks){

        const firstSession =  await prisma.workingHours.findFirst({
            where:{
                task_id:task.id,
            },orderBy:{started_at:"asc"}
        });
        if(!firstSession) continue;

        const taskStart = firstSession.started_at;
        if(now.getTime() - taskStart.getTime()> MAX_SESSION_MS){
            const activeSession = await prisma.workingHours.findFirst({
                where:{
                    task_id:task.id,
                    ended_at:null,
                }
        });
        if(!activeSession) continue;
        const forcedEnd = now;
        const duration = secondsBetween(activeSession.started_at, forcedEnd);

        await prisma.workingHours.update({
            where:{id:activeSession.id},
            data:{
                ended_at:forcedEnd,
                duration_seconds:duration,
            }
        });

        await prisma.taskFlag.create({
                data: {
                    taskId: task.id,
                    userId: task.user_id,
                    type: "USER_FORGOT_TO_END",
                    severity: 3,
                    reason: "Task exceeded maximum allowed working window"
                }
            });

        await prisma.taskAlert.create({
                data: {
                    taskId: task.id,
                    userId: task.user_id,
                    type: "AUTO_END_APPLIED",
                    meta: {
                        startedAt: taskStart,
                        exceededHours: (now.getTime() - taskStart.getTime()) / 3600000
                    }
                }
            });
    }
}
}