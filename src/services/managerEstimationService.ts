import prisma from "../config/database/client";
import { secondsBetween } from "../modules/workingHours/utils/calculateSecs";
import { parseHHMMToHours } from "../utils/timeFormat";
import { AppError } from "../config/utils/AppError";



export async function calculateManagerEstimationScore(managerId:string,projectId:string){
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const period = `${year}-${String(month).padStart(2, "0")}`;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    console.log("[MEAS][DEBUG] ----------------------------------------------------------------");
    console.log("[MEAS][DEBUG] calculateManagerEstimationScore called");
    console.log("[MEAS][DEBUG] inputs:", { managerId, projectId, period });
    console.log("[MEAS][DEBUG] date window:", {
        startDateIso: startDate.toISOString(),
        endDateIso: endDate.toISOString(),
        nowIso: now.toISOString(),
    });

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            name: true,
            managerID: true,
            stage: true,
            status: true,
            isDeleted: true,
        },
    });
    console.log("[MEAS][DEBUG] project lookup:", project);

    const [
        taskCountOnProject,
        completedTaskCountOnProject,
        completedTaskCountOnProjectInPeriod,
        completedTaskCountForManagerOnProject,
        completedTaskCountForManagerOnProjectInPeriod,
    ] = await Promise.all([
        prisma.task.count({ where: { project_id: projectId } }),
        prisma.task.count({ where: { project_id: projectId, status: "COMPLETED" } }),
        prisma.task.count({
            where: {
                project_id: projectId,
                status: "COMPLETED",
                updatedAt: { gte: startDate, lt: endDate },
            },
        }),
        prisma.task.count({
            where: {
                project_id: projectId,
                project: { managerID: managerId },
                status: "COMPLETED",
            },
        }),
        prisma.task.count({
            where: {
                project_id: projectId,
                project: { managerID: managerId },
                status: "COMPLETED",
                updatedAt: { gte: startDate, lt: endDate },
            },
        }),
    ]);

    console.log("[MEAS][DEBUG] filter counts:", {
        taskCountOnProject,
        completedTaskCountOnProject,
        completedTaskCountOnProjectInPeriod,
        completedTaskCountForManagerOnProject,
        completedTaskCountForManagerOnProjectInPeriod,
    });

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
    console.log(`[MEAS][DEBUG] matched tasks count: ${tasks.length}`);
    if (tasks.length > 0) {
        console.log(
            "[MEAS][DEBUG] matched task snapshot:",
            tasks.map((t) => ({
                id: t.id,
                status: t.status,
                updatedAt: t.updatedAt,
                project_id: t.project_id,
                allocatedHours: t.allocationLog?.allocatedHours ?? null,
                segments: t.workingHourTask.length,
            }))
        );
    }

    if (tasks.length === 0) {
        const nearbyTasks = await prisma.task.findMany({
            where: {
                project_id: projectId,
                status: "COMPLETED",
            },
            select: {
                id: true,
                status: true,
                updatedAt: true,
                created_on: true,
                project_id: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 20,
        });
        console.log("[MEAS][DEBUG] no-match diagnostic: latest completed tasks on project", nearbyTasks);

        throw new AppError(
            `No completed tasks found for manager ${managerId} on project ${projectId} in ${period}`,
            404
        );
    }


    const scores:number[] = [];

    for(const task of tasks){
        const allocated = parseHHMMToHours(task.allocationLog?.allocatedHours);
        if(allocated === 0) {
            console.log("[MEAS][DEBUG] task skipped (allocated=0)", {
                taskId: task.id,
                allocatedHoursRaw: task.allocationLog?.allocatedHours ?? null,
            });
            continue;
        }

        let totalSeconds = 0;

        for(const segment of task.workingHourTask){
            const end = segment.ended_at ?? now
            const duration = 
                segment.duration_seconds ?? 
                secondsBetween(segment.started_at,end);
            totalSeconds += duration;
            console.log("[MEAS][DEBUG] segment", {
                taskId: task.id,
                segmentId: segment.id,
                startedAt: segment.started_at,
                endedAt: segment.ended_at,
                durationSecondsStored: segment.duration_seconds,
                durationSecondsUsed: duration,
            });
        }
        const actual = totalSeconds /3600;
        const deviation = Math.abs(actual - allocated)/allocated;
        let accuracy = 100 -(deviation*100);
        if(accuracy <0) accuracy =0;
        scores.push(accuracy);
        console.log("[MEAS][DEBUG] task score", {
            taskId: task.id,
            allocatedHours: allocated,
            actualHours: Number(actual.toFixed(4)),
            totalSeconds,
            deviation: Number(deviation.toFixed(6)),
            accuracy: Number(accuracy.toFixed(4)),
        });
    }
    if (scores.length === 0) {
        console.log("[MEAS][DEBUG] all matched tasks were skipped because allocated=0 or invalid");
        throw new AppError(
            `No valid completed tasks with allocated hours found for manager ${managerId} on project ${projectId} in ${period}`,
            404
        );
    }

    const avgScore = scores.reduce((s,v)=>s+v,0)/scores.length;
    console.log("[MEAS][DEBUG] score summary", {
        tasksUsedForScore: scores.length,
        avgScoreRaw: avgScore,
        avgScoreRounded: Number(avgScore.toFixed(2)),
        period,
    });

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
    console.log("[MEAS][DEBUG] upserted manager_estimation_score", {
        id: measRecord.id,
        managerId: measRecord.managerId,
        projectId: measRecord.projectId,
        period: measRecord.period,
        score: measRecord.score,
        calculatedAt: measRecord.calculatedAt,
    });
    console.log("[MEAS][DEBUG] ----------------------------------------------------------------");
    return measRecord;
}
