import { WHRepository } from "../repositories";
import { FindWhDTO, CreateWhDTO, UpdateWhDTO, FindManyDTO } from "../dtos/wh.dto";
import prisma from "../../../config/database/client";
import { secondsBetween } from "../utils/calculateSecs";

const whRepository = new WHRepository();

export class WHService {
    async startTask(findData: FindWhDTO,taskId:string,userId:string) {
        const active = await whRepository.findFirst(findData);
        if (active) {
            throw new Error("You have an active task. Please end it before starting a new one.");
        }
        const wh = await whRepository.create(userId,taskId);
        await prisma.task.update({
            where: { id: taskId },
            data: { status: "IN_PROGRESS" }
        });
        return wh;
    }

    async pauseTask(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if (!active) {
            throw new Error("No active task found to pause.");
        }
        const now = new Date();
    const duration = secondsBetween(active.started_at, now);

    const wh = await whRepository.closeSession({
        id: active.id,
        ended_at: now,
        duration_seconds: duration
    });
        await prisma.task.update({
        where: { id: findData.task_id },
        data: { status: "BREAK" }
    });
        return wh;
    }
    async resumeTask(findData: FindWhDTO,userId:string,taskId:string) {
        const active = await whRepository.findFirst(findData);
        if (active) {
            throw new Error("You have an active task. Please end it before resuming.");
        }
         const wh = await whRepository.create(
        taskId,
        userId,
    );
       
        await prisma.task.update({
            where: { id: taskId },
            data: { status: "IN_PROGRESS" }
        });
        return wh;
    }
    async endTask(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if (!active) {
        throw new Error("No active task session found to end.");
    }
        const now = new Date();
        const duration= secondsBetween(active.started_at,now)

        const wh = await whRepository.closeSession({
        id: active.id,
        ended_at: now,
        duration_seconds: duration
    });

        await prisma.task.update({
            where: { id: findData.task_id },
            data: { status: "COMPLETED" }
        });
        return wh;
     
    }
    async startRework(findData: FindWhDTO, userId:string,taskId:string) {
        const active = await whRepository.findFirst(findData);
        if(active){
            const now = new Date();
            const duration= secondsBetween(active.started_at,now)
    
            await whRepository.closeSession({
            id: active.id,
            ended_at: now,
            duration_seconds: duration
        });
        }
        await prisma.task.update({
            where: { id: taskId},
            data: { status: "REWORK" }
        });
        return await whRepository.create(taskId,userId);
    }


    async endRework(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);

        if (!active || active.type !== "REWORK") {
        throw new Error("No active REWORK session found to end.");
    }
        const now = new Date();
        const duration= secondsBetween(active.started_at,now)

         const wh = await whRepository.closeSession({
        id: active.id,
        ended_at: now,
        duration_seconds: duration
    });
        await prisma.task.update({
            where: { id: findData.task_id },
            data: { status: "COMPLETED" }
        });
        return wh;
    }
    async getTaskSummary(data: FindManyDTO) {
    const now = new Date();
    const segments = await whRepository.findManyByTaskIdAndUserId(data);

    let work = 0;
    let rework = 0;
    let activeSession: any = null;

    for (const segment of segments) {

        if (segment.ended_at === null) {
            activeSession = segment;
        }

        const end = segment.ended_at ?? now;
        const duration = segment.duration_seconds ??
                         secondsBetween(segment.started_at, end);

        if (segment.type === "WORK") work += duration;
        else if (segment.type === "REWORK") rework += duration;
    }

    const total = work + rework;

    //Fetch allocated hours
    const allocation = await prisma.taskAllocation.findUnique({
        where: { taskId: data.task_id }
    });

    return {
        totalSeconds: total,        // total time spent
        workSeconds: work,
        reworkSeconds: rework,

        //NEW: whether the timer is running
        isActive: activeSession != null,

        //NEW: start time of current session
        activeSessionStartedAt: activeSession?.started_at ?? null,

        //NEW: allocated hours for FE calculations
        allocatedHours: allocation?.allocatedHours ?? null,

        // (optional) nicely formatted values
        totalHours:  (total / 3600).toFixed(2),
        workHours:   (work / 3600).toFixed(2),
        reworkHours: (rework / 3600).toFixed(2),
        totalMinutes: Math.floor(total / 60),

    };
}
}