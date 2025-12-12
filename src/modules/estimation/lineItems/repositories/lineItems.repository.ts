import prisma from "../../../../config/database/client";
import { cleandata } from "../../../../config/utils/cleanDataObject";
import { lineItemDto,
    updateLineItemGroupDto,
    lineItemGroupDto,
    updateLineItemDto } from "../dtos";

export class LineItemsRepository{
    async createLineItemGroup(data:lineItemGroupDto){
        const cleanData=cleandata(data)
        return await prisma.estimationLineItemGroup.create({
            data:{
                ...cleanData
            }
        })
    }
    async updateLineItemGroup(id:string,data:updateLineItemGroupDto){
        const cleanData=cleandata(data)
        return await prisma.estimationLineItemGroup.update({
            where:{id},
            data:{
                ...cleanData
            }
        })
    }
    async getGroupsByEstimationId(estimationId:string){
        return await prisma.estimationLineItemGroup.findMany({
            where:{estimationId}
        })
    }
    async deleteLineItemGroup(id:string){
        return await prisma.estimationLineItemGroup.delete({
            where:{id}
        })
    }
    async getAllGroups(){
        return await prisma.estimationLineItemGroup.findMany()
    }
    async getLineItemGroupById(id:string){
        return await prisma.estimationLineItemGroup.findUnique({
            where:{id}
        })
    }

    async getLineItemsByGroupId(groupId:string){
        return await prisma.estimationLineItem.findMany({
            where:{groupId}
        })
    }
//Line Items
    async createLineItem(data:lineItemDto){
        const cleanData=cleandata(data)
        return await prisma.estimationLineItem.create({
            data:{
                ...cleanData
            }
        })
    }
    async updateLineItem(id:string,data:updateLineItemDto){
        const cleanData=cleandata(data)
        return await prisma.estimationLineItem.update({
            where:{id},
            data:{
                ...cleanData
            }
        })
    }

    async deleteLineItem(id:string){
        return await prisma.estimationLineItem.delete({
            where:{id}
        })
    }
    async getByGroupId(groupId:string){
        return await prisma.estimationLineItem.findMany({
            where:{groupId}
        })
    }
}
