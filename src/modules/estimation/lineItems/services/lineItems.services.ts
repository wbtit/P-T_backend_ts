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
        const updatedGroup = await this.lineItemsRepo.updateLineItemGroup(id, data);
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
        const result = await this.lineItemsRepo.createLineItem(data);
        
        if (result.groupId) {
            await this.recalculateGroupTotals(result.groupId);
        }
        
        return result;
    }
    
    async updateLineItem(id:string,data:updateLineItemDto){
        const result = await this.lineItemsRepo.updateLineItem(id,data);
        
        if (result.groupId) {
            await this.recalculateGroupTotals(result.groupId);
        }
        
        return result;
    }
    
    private async recalculateGroupTotals(groupId: string) {
        const items = await this.lineItemsRepo.getByGroupId(groupId);
        const group = await this.lineItemsRepo.getLineItemGroupById(groupId);
        
        if (!group) return;
        
        const sumHours = items.reduce((sum, item) => sum + (item.totalHours ?? 0), 0);
        const sumWeeks = items.reduce((sum, item) => sum + (item.weeks ?? 0), 0);
        
        // Directly update the group's totals in the DB without triggering downward distribution
        await this.lineItemsRepo.updateLineItemGroup(groupId, {
            totalHours: sumHours,
            weeks: sumWeeks
        });
    }
    async getLineItemsByGroupId(groupId:string){
        return await this.lineItemsRepo.getByGroupId(groupId);
    }
    async deleteLineItem(id:string){
        const item = await this.lineItemsRepo.deleteLineItem(id);
        
        if (item.groupId) {
            await this.recalculateGroupTotals(item.groupId);
        }
        return item;
    }
}
