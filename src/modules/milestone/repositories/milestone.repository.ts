import prisma from "../../../config/database/client";
import { cleandata } from "../../../config/utils/cleanDataObject";
import { CreateMileStoneDto,UpdateMileStoneDto } from "../dtos";

export class MileStoneRepository{
    async create(data:CreateMileStoneDto){
        const cleanData= cleandata(data)
        return await prisma.mileStone.create({
            data:cleanData
        })
    }
    async update(data:UpdateMileStoneDto,id:string){
        const cleanData = cleandata(data)
        return await prisma.mileStone.update({
            where:{id},
            data:cleanData
        })
    }
    async getAll(){
        return await prisma.mileStone.findMany({
            include:{
                project:true,
                Tasks:true,
                fabricator:true
            }
        })
    }
    async getById(id:string){
        return await prisma.mileStone.findUnique({
            where:{id},
            include:{
                project:true,
                Tasks:true,
                fabricator:true
            }
        })
    }
    async delete(id:string){
        return await prisma.mileStone.delete({
            where:{id}
        })
    }
    async getByProject(id:string){
        return await prisma.mileStone.findMany({
            where:{project_id:id},
            include:{
                project:true,
                Tasks:true,
                fabricator:true
            }
        })
    }

    async getPendingSubmittals(){
        return await prisma.mileStone.findMany({
            where:{
                mileStoneSubmittals:{none:{}}
            }
        })
    }
}
