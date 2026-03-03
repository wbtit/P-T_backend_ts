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
        const { totalHours: _ignoredTotalHours, ...groupPayload } = data as updateLineItemGroupDto & { totalHours?: number };
        const cleanData=cleandata(groupPayload)
        return await prisma.estimationLineItemGroup.update({
            where:{id},
            data:{
                ...cleanData
            }
        })
    }
    async getGroupsByEstimationId(estimationId:string){
        return await prisma.estimationLineItemGroup.findMany({
            where:{estimationId},include:{
                lineItems:true
            }
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
        const group=await prisma.estimationLineItemGroup.findUnique({
            where:{id},
        });
       const items=await prisma.estimationLineItem.aggregate({
        where:{groupId:group?.id},
        _sum:{
            totalHours:true,
            weeks:true
        },
        _count:{
            id:true 
        }
       })
       const totalHours = items._sum.totalHours;
       const totalWeeks = items._sum.weeks;
        
       
       return {
            group,
            totalHours,
            totalWeeks
        }

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
    async getByGroupId(groupId:string|undefined){
        return await prisma.estimationLineItem.findMany({
            where:{groupId}
        })
    }

    async applyGroupTotalHours(groupId: string, totalHours: number, divisor?: number) {
        const items = await prisma.estimationLineItem.findMany({
            where: { groupId },
            orderBy: { createdAt: "asc" },
        });

        if (items.length === 0) return [];

        const currentTotal = items.reduce((sum, item) => sum + (item.totalHours ?? 0), 0);

        // Preserve existing proportions when possible; otherwise split evenly.
        const rawHours = items.map((item) => {
            if (currentTotal > 0) return ((item.totalHours ?? 0) / currentTotal) * totalHours;
            return totalHours / items.length;
        });

        // Keep exact sum by applying rounding diff to the last item.
        const rounded = rawHours.map((value) => Number(value.toFixed(4)));
        const diff = Number((totalHours - rounded.reduce((sum, value) => sum + value, 0)).toFixed(4));
        rounded[rounded.length - 1] = Number((rounded[rounded.length - 1] + diff).toFixed(4));

        return prisma.$transaction(
            items.map((item, index) =>
                prisma.estimationLineItem.update({
                    where: { id: item.id },
                    data: {
                        totalHours: rounded[index],
                        weeks:
                            typeof divisor === "number" && divisor > 0
                                ? Number((rounded[index] / divisor).toFixed(4))
                                : item.weeks,
                    },
                })
            )
        );
    }

    async recomputeWeeksByGroup(groupId: string, divisor: number) {
        if (divisor <= 0) return [];

        const items = await prisma.estimationLineItem.findMany({
            where: { groupId },
        });

        return prisma.$transaction(
            items.map((item) =>
                prisma.estimationLineItem.update({
                    where: { id: item.id },
                    data: {
                        weeks:
                            typeof item.totalHours === "number"
                                ? Number((item.totalHours / divisor).toFixed(4))
                                : null,
                    },
                })
            )
        );
    }
}
