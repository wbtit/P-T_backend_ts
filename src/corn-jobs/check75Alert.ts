import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";

export async function check75Alert() {
    const now = new Date();

    const tasks = await prisma.task.findMany({
        where:{
            status:{in:["IN_PROGRESS","BREAK"]},
            seventyFiveAlertSent:false
        },include:{allocationLog:true,workingHourTask:true}
        
    });
    for(const task of tasks){
        const allocatedHours = Number(task.allocationLog?.allocatedHours ?? 0);
        if(!allocatedHours) continue;

        const allocatedSeconds = allocatedHours * 3600;
        const threshld75 = allocatedSeconds * 0.75;

        let totalSeconds = 0;

        for(const segement of task.workingHourTask){
            const end = segement.ended_at ?? now;
            const duration = segement.duration_seconds??
            secondsBetween(segement.started_at,end);
            totalSeconds += duration;
        }
        if(totalSeconds >= threshld75){
            await prisma.task.update({
                where:{id:task.id},
                data:{seventyFiveAlertSent:true}
            });
            await prisma.taskAlert.create({
                data:{
                    taskId: task.id,
                    userId: task.user_id,
                    type: "APPROACHING_75_PERCENT",
                    meta: {
                        allocatedHours,
                        workedHours: (totalSeconds / 3600).toFixed(2),
                        percentUsed: ((totalSeconds / allocatedSeconds) * 100).toFixed(2),
                }
            }
            });
            await prisma.taskFlag.create({
                data:{
                    taskId: task.id,
                    userId: task.user_id,
                    type: "FREQUENT_75_PERCENT_ALERTS",
                    severity: 1,
                    reason: "Task has used over 75% of allocated hours"
                }
            });
            console.log(`75% alert created for task ID: ${task.id}`);
        }
    }
}