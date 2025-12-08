import { Activity, Stage } from "@prisma/client";
import prisma from "../../../../config/database/client";
import { WBSInput,UpdateWBSInput } from "../dtos";



export class WbsRepository{
    async create(data:WBSInput){
        return await prisma.workBreakdown.create({
            data
        });
    }
    async getAll(){
        return await prisma.workBreakdown.findMany({
            include:{
                LineItems:true
            }
        
        });
    }
    async getById(id:string){
        return await prisma.workBreakdown.findUnique({
            where:{id},
            include:{
                LineItems:true
            }
        });
    }
    async getWbsForProject(projectId:string,stage:Stage,type:Activity){
        return await prisma.workBreakdown.findMany({
            where: {
                projectId,
                stage,
                type
            },include:{
                LineItems:true
            }
        });
    }
    async getTotalWbsHours(projectId:string,stage:Stage){
        return await prisma.workBreakdown.aggregate({
            where:{
                projectId,
                stage
            },
            _sum:{
                totalCheckHr:true,
                totalExecHr:true,
                totalCheckHrWithRework:true,
                totalExecHrWithRework:true
            }
        })
    }
    async getWbsTotal(projectId:string,stage:Stage,type:Activity){
        return await prisma.workBreakdown.aggregate({
            where:{
                projectId,
                stage,
                type
            },
            _sum:{
                totalQtyNo:true,
                totalCheckHr:true,
                totalExecHr:true,
                totalExecHrWithRework:true,
                totalCheckHrWithRework:true,
            }
        })
    }
    async Update(id:string,data:UpdateWBSInput,projectId:string,stage:Stage){
        return await prisma.workBreakdown.update({
            where:{
                id,
                projectId,
                stage
            },
            data
        })
    }
}