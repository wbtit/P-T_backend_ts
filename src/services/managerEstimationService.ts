import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { parseHHMMToHours } from "../utils/timeFormat";



export async function calculateManagerEstimationScore(managerId:string,projectId:string){
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const tasks = await prisma.task.findMany({
        where:{
            project:{id:projectId,managerID:managerId},
            status:{in:["COMPLETED"]},
            updatedAt:{gte:startDate,lt:endDate}
        },include:{
            allocationLog:true,
            workingHourTask:true
        }
    });

    if (tasks.length === 0) {
        return {
            projectId,
            managerId,
            period: `${year}-${String(month).padStart(2, "0")}`,
            score: 100 // default when no tasks
        };
    }


    const scores:number[] = [];

    for(const task of tasks){
        const allocated = parseHHMMToHours(task.allocationLog?.allocatedHours);
        if(allocated === 0) continue;

        let totalSeconds = 0;

        for(const segment of task.workingHourTask){
            const end = segment.ended_at ?? now
            const duration = 
                segment.duration_seconds ?? 
                secondsBetween(segment.started_at,end);
            totalSeconds += duration;
        }
        const actual = totalSeconds /3600;
        const deviation = Math.abs(actual - allocated)/allocated;
        let accuracy = 100 -(deviation*100);
        if(accuracy <0) accuracy =0;
        scores.push(accuracy);
    }
    const avgScore = scores.reduce((s,v)=>s+v,0)/scores.length;
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const measRecord = await prisma.managerEstimationScore.upsert({
        where:{
            managerId_projectId_period:{
                managerId,
                projectId,
                period
            }
        },
        create:{
            managerId,
            projectId,
            period,
            score:Number(avgScore.toFixed(2))
        },
        update:{
            score:Number(avgScore.toFixed(2)),
            calculatedAt:new Date()
        },include:{
            project:{select:{id:true,name:true}},
            manager:{select:{id:true,firstName:true,middleName:true,lastName:true,email:true}}
            
        }
    });
    return measRecord;
}