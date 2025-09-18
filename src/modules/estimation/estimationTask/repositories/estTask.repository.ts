import prisma from "../../../../config/database/client";
import { cleandata } from "../../../../config/utils/cleanDataObject";
import { createEstimationTaskInput,updateEstimationTaskInput } from "../dtos";

export class EstimationTaskRepository{
    async create(data:createEstimationTaskInput,assignedById:string){
        const cleanData= cleandata(data)
        return await prisma.estimationTask.create({
            data:{
                ...cleanData,
                assignedById:assignedById
            }
        })
    }
    async review(id:string,data:updateEstimationTaskInput,reviewerId:string){
        return await prisma.estimationTask.update({
            where:{id},
            data:{
                ...data,
                reviewedById:reviewerId
            },include:{
                estimation:true,
                assignedTo:true,
                reviewedBy:true
            }
        })
            
    }
    async getAll(){
        return await prisma.estimationTask.findMany()
    }
    async getById(id:string){
        return await prisma.estimationTask.findFirst({
            where:{id},
            include:{
                 estimation:true,
                 assignedTo:true,
                 reviewedBy:true,
                 workinghours:true
            }
        })
    }
    async getMyTask(userId:string){
        return await prisma.estimationTask.findMany({
        where:{
          assignedToId:userId,
          status: { notIn: ["COMPLETED"] }  
        },
        include:{
            workinghours:true,
            estimation:true
        }
        })
    }
    async update(id:string,data:updateEstimationTaskInput){
        return await prisma.estimationTask.update({
            where:{id},
            data:data
        })
    }
    async delete(id:string){
        return await prisma.estimationTask.delete({
                where:{id}
            })
    }
}