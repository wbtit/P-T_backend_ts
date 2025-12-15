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
        const wbs =await prisma.workBreakdown.findUnique({
            where:{id},
            include:{
                LineItems:true
            }
        });
        return wbs;
    
    }
    async getWbsForProject(projectId: string, stage: Stage, type: Activity) {
        // 1. Fetch all WBS for the project + their line items
        const wbsList = await prisma.workBreakdown.findMany({
            where: { projectId, stage, type },
            include: { LineItems: true }
        });

        // 2. Iterate + aggregate + update each WorkBreakdown
        for (const wbs of wbsList) {
            const items = wbs.LineItems;

            const totalCheckHr = items.reduce((sum, item) => sum + (item.checkHr || 0), 0);
            const totalExecHr = items.reduce((sum, item) => sum + (item.execHr || 0), 0);
            const totalQtyNo = items.reduce((sum, item) => sum + (item.QtyNo || 0), 0);

            // If "with rework" is also based on a field in items, compute here:
            const totalCheckHrWithRework = items.reduce((sum, item) => sum + (item.checkHrWithRework || 0), 0);
            const totalExecHrWithRework = items.reduce((sum, item) => sum + (item.execHrWithRework || 0), 0);

            await prisma.workBreakdown.update({
                where: { id: wbs.id },
                data: {
                    totalCheckHr,
                    totalExecHr,
                    totalCheckHrWithRework,
                    totalExecHrWithRework,
                    totalQtyNo
                }
            });
        }

        return wbsList;
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