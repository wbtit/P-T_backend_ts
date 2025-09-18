import { CreateEstimationDtoType,UpdateEstimationDtoType } from "../dtos";
import prisma from "../../../../config/database/client";
import { cleandata } from "../../../../config/utils/cleanDataObject";
import { EstimationStatus } from "@prisma/client";

export class EstManagementRepository{
    async create(data:CreateEstimationDtoType,createdById:string){
        const cleanData=cleandata(data)
        return await prisma.estimation.create({
            data:{
                ...cleanData,
                createdById
            }
        })
    }   
    async getAll(){
        return await prisma.estimation.findMany({
            include:{
                createdBy:true,
                fabricators:true,
                rfq:true
            }
        })
    }
    async getById(id:string){
        return await prisma.estimation.findUnique({
            where:{id:id},
            include:{
                 rfq:true,
                 createdBy:true,
                 tasks:{
                    include:{
                        assignedTo:{
                            select:{
                                firstName:true,
                                middleName:true,
                                lastName:true
                            }
                        },
                        assignedBy:{
                            select:{
                                firstName:true,
                                middleName:true,
                                lastName:true
                            }
                        }
                    }
                 },
                 lineItems:true,
                 fabricators:true
            }
        })
    }
    async getByCreatorId(id:string){
        return await prisma.estimation.findMany({
            where:{createdById:id},
            include:{
                 rfq:true,
                 createdBy:true,
                 tasks:{
                    include:{
                        assignedTo:{
                            select:{
                                firstName:true,
                                middleName:true,
                                lastName:true
                            }
                        },
                        assignedBy:{
                            select:{
                                firstName:true,
                                middleName:true,
                                lastName:true
                            }
                        }
                    }
                 },
                 lineItems:true,
                 fabricators:true
            }
        })
    }
    async update(id:string,data:UpdateEstimationDtoType){
        return await prisma.estimation.update({
            where:{id},
            data:data,
            include:{
                 rfq:true,
                 createdBy:true,
                 tasks:true,
                 lineItems:true,
            }
        })
    }
    async delete(id:string){
        return await prisma.estimation.delete({
            where:{id}
        })
    }
    async updateStatus(id:string,status:EstimationStatus){
        return await prisma.estimation.update({
        where:{id},
        data:{
            status:status
        },include:{
                 rfq:true,
                 createdBy:true,
                 tasks:true,
                 lineItems:true,
            }
    })
    }
    async setFinalPrice(id:string,finalPrice:number){
        return await prisma.estimation.update({
            where:{id},
            data:{
                finalPrice:finalPrice
            },include:{
                rfq:true,
                createdBy:true,
                tasks:true,
                lineItems:true,
            }
        })
    }
}