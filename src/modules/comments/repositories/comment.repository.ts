import prisma from "../../../config/database/client";
import { cleandata } from "../../../config/utils/cleanDataObject";
import { commentDto } from "../dtos";

export class CommentRepository{
    async create(data:commentDto,user_id:string){
        const cleanData=cleandata(data)
        return await prisma.comment.create({
            data:{
                ...cleanData,user_id
            }
        })
    }
    async update(id:string){
        return await prisma.comment.update({
            where:{id},
            data:{
                acknowledged:true,
                acknowledgedTime:new Date()
            }
        })
    }
    async getByTaskId(id:string){
        return await prisma.comment.findMany({
            where:{task_id:id}
        })
    }
    // async getByEstimationTaskId(id:string){
    //     return await prisma.comment.findMany({
    //         where:{estimationTaskId:id}
    //     })
    // }
    async getByUserId(id:string){
        return await prisma.comment.findMany({
            where:{user_id:id}
        })
    }
}
