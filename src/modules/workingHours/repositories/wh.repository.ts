import prisma from "../../../config/database/client";
import { FindWhDTO,
         CreateWhDTO,
         UpdateWhDTO,
         FindManyDTO
 } from "../dtos/wh.dto";
 import { cleandata } from "../../../config/utils/cleanDataObject";

 

export class WHRepository {
    async findFirst(data: FindWhDTO) {
        const wh = await prisma.workingHours.findFirst({
            where: {
                user_id: data.user_id,
                task_id: data.task_id,
                ended_at:null  
            },
            orderBy: { started_at: "desc" }
        });
        return wh;
    }
    async closeSession(data: { id: string; ended_at: Date; duration_seconds: number }) {
    return prisma.workingHours.update({
        where: { id: data.id },
        data: {
            ended_at: data.ended_at,
            duration_seconds: data.duration_seconds
        }
    });
}

    async create(userId:string,taskId:string){
        
        const wh=await prisma.workingHours.create({
            data:{
                user_id:userId,
                task_id:taskId,
                type:"WORK",
                started_at:new Date(),
            }
        });
        return wh;
    }
    async update(data:UpdateWhDTO){
        const cleanData = cleandata(data)
        const wh=await prisma.workingHours.update({
            where:{id:cleanData.id},
            data:{
                ended_at:new Date(),
                duration_seconds:cleanData.duration_seconds,
            }
        });
        return wh;
    }
    async createrework(userId:string,taskId:string){
     
        const wh=await prisma.workingHours.create({
            data:{
                user_id:userId,
                task_id:taskId,
                type:"REWORK",
            }
        });
        return wh;
    }
    async findManyByTaskIdAndUserId(data:FindManyDTO){
        const wh = await prisma.workingHours.findMany({
            where: {
                user_id: data.user_id,
                task_id: data.task_id,
            }
        });
        return wh;
    }
}