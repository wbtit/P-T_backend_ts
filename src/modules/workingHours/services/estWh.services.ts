import { EstimationWHRepository } from "../repositories";
import { FindWhDTO, CreateWhDTO, UpdateWhDTO, FindManyDTO } from "../dtos/wh.dto";
import prisma from "../../../config/database/client";
import { secondsBetween } from "../utils/calculateSecs";

const whRepository = new EstimationWHRepository();

export class EstWHService {
    async startTask(findData: FindWhDTO, createData: CreateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if (active) {
            throw new Error("You have an active task. Please end it before starting a new one.");
        }
        const wh = await whRepository.create(createData);
        await prisma.estimationTask.update({
            where: { id: createData.estimationTaskId },
            data: { status: "IN_PROGRESS" }
        });
        return wh;
    }
    async pauseTask(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if (!active) {
            throw new Error("No active task found to pause.");
        }
        if (active.id !== updateData.id) {
            throw new Error("The provided working hours ID does not match the active task.");
        }
        const wh = await whRepository.update(updateData);
        await prisma.estimationTask.update({
            where: { id: findData.estimationTaskId },
            data: { status: "BREAK" }
        });
        return wh;
    }
    async resumeTask(findData: FindWhDTO, createData: CreateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if (active) {
            throw new Error("You have an active task. Please end it before resuming.");
        }
        const wh = await whRepository.createrework(createData);
        await prisma.estimationTask.update({
            where: { id: createData.estimationTaskId },
            data: { status: "IN_PROGRESS" }
        });
        return wh;
    }
    async endTask(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);
       if(active){
        const now = new Date();
        const duration= secondsBetween(active.started_at,now)

        const wh = await whRepository.update({
            id: active.id,
            duration_seconds: duration
        });
        await prisma.estimationTask.update({
            where: { id: findData.estimationTaskId },
            data: { status: "COMPLETED" }
        });
        return wh;
     }
    }
    async startRework(findData: FindWhDTO, createData: CreateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if(active){
            const now = new Date();
            const duration= secondsBetween(active.started_at,now)
    
            await whRepository.update({
                id: active.id,
                duration_seconds: duration
            });
        }
        await prisma.estimationTask.update({
            where: { id: createData.estimationTaskId },
            data: { status: "REWORK" }
        });
        const wh = await whRepository.createrework(createData);
        return wh;
    }
    async endRework(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if(!active || active.type!=="REWORK"){
            throw new Error("No active rework task found to end.");
        }
        if (active.id !== updateData.id) {
            throw new Error("The provided working hours ID does not match the active rework task.");
        }
        const now = new Date();
        const duration= secondsBetween(active.started_at,now)

        const wh = await whRepository.update({
            id: active.id,
            duration_seconds: duration
        });
        await prisma.estimationTask.update({
            where: { id: findData.estimationTaskId },
            data: { status: "COMPLETED" }
        });
        return wh;
    }
    async getTaskSummary(data: FindManyDTO) {
        const now = new Date(); 
        const segements = await whRepository.findManyByTaskIdAndUserId(data);
        let work=0,rework=0;
        for(const segement of segements){
            const end= segement.ended_at ?? now;
            const duration=segement.duration_seconds ?? secondsBetween(segement.started_at,end);
            if(segement.type==="WORK"){
                work+=duration;
            }
            if(segement.type==="REWORK"){
                rework+=duration;
            }
        }
        const total = work + rework;
        return {
            totalSeconds: total,
            workSeconds: work,
            reworkSeconds: rework,
            totalHours: (total / 3600).toFixed(2),
            workHours: (work / 3600).toFixed(2),
            reworkHours: (rework / 3600).toFixed(2),
            totalMinutes: Math.floor(total / 60)
        };
    }
}