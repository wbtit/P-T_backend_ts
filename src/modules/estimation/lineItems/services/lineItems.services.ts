import createEstimationLineItem from "../../management/utils/estimation.util";
import {lineItemDto,
        updateLineItemDto,
        lineItemGroupDto,
        updateLineItemGroupDto
} from "../dtos";
import {LineItemsRepository} from "../repositories"

export class LineItemsService{
    private lineItemsRepo:LineItemsRepository;
    constructor(){
        this.lineItemsRepo=new LineItemsRepository();
    }
//Line Item Groups
    async createLineItemGroup(data:lineItemGroupDto){
        const group =  await this.lineItemsRepo.createLineItemGroup(data);
        if(group.id){
            await createEstimationLineItem(group.id);
        }
        return group;
    }
    async updateLineItemGroup(id:string,data:updateLineItemGroupDto){
        const { totalHours, ...groupPayload } = data as updateLineItemGroupDto & { totalHours?: number };

        const updatedGroup = await this.lineItemsRepo.updateLineItemGroup(id, groupPayload);

        if (typeof totalHours === "number") {
            await this.lineItemsRepo.applyGroupTotalHours(
                id,
                totalHours,
                updatedGroup.divisor ?? undefined
            );
        } else if (typeof updatedGroup.divisor === "number") {
            // If divisor changed, keep totals and recompute weeks.
            await this.lineItemsRepo.recomputeWeeksByGroup(id, updatedGroup.divisor);
        }

        return await this.lineItemsRepo.getLineItemGroupById(id);
    }
    async getGroupsByEstimationId(estimationId:string){
        return await this.lineItemsRepo.getGroupsByEstimationId(estimationId);
    }
    async deleteLineItemGroup(id:string){
        return await this.lineItemsRepo.deleteLineItemGroup(id);
    }
    async getAllGroups(){
        return await this.lineItemsRepo.getAllGroups();
    }
    async getLineItemGroupById(id:string){
        return await this.lineItemsRepo.getLineItemGroupById(id);
    }
//Line Items
    async createLineItem(data:lineItemDto){
        return await this.lineItemsRepo.createLineItem(data);
    }
    async updateLineItem(id:string,data:updateLineItemDto){
        return await this.lineItemsRepo.updateLineItem(id,data);
    }
    async getLineItemsByGroupId(groupId:string){
        return await this.lineItemsRepo.getByGroupId(groupId);
    }
    async deleteLineItem(id:string){
        return await this.lineItemsRepo.deleteLineItem(id);
    }
}
