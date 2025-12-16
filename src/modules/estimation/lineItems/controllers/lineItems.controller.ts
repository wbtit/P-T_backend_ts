import { AppError } from "../../../../config/utils/AppError";
import{Request,Response} from "express"
import { LineItemsService } from "../services";

const lineItemsService=new LineItemsService()

export class LineItemsController{
    //Groups
     async handleCreateLineItemGroup(req:Request,res:Response){
        const data=req.body
        const result=await lineItemsService.createLineItemGroup(data)
        return res.status(201).json({
            message:"Line Item Group created successfully",
            success:true,
            data:result
        })
    }
async handleUpdateLineItemGroup(req:Request,res:Response){
        const {id}=req.params
        const data=req.body
        const result=await lineItemsService.updateLineItemGroup(id,data)
        if(!result){
            throw new AppError("Failed to update Line Item Group",400)
        }
        return res.status(200).json({
            message:"Line Item Group updated successfully",
            success:true,
            data:result
        })
    }
    
    async handleGetGroupsByEstimationId(req:Request,res:Response){
        const {id}=req.params
        const result=await lineItemsService.getGroupsByEstimationId(id)
        if(!result){
            throw new AppError("Failed to fetch Line Item Groups by EstimationId",500)
        }
        return res.status(200).json({
            message:"Line Item Groups fetched successfully",
            success:true,
            data:result
        })
    }

    
    async handleDeleteLineItemGroup(req:Request,res:Response){
        const {id}=req.params
        const result=await lineItemsService.deleteLineItemGroup(id)
        if(!result){
            throw new AppError("Failed to delete Line Item Group",400)
        }
        return res.status(200).json({
            message:"Line Item Group deleted successfully",
            success:true,
            data:result
        })
    }

    async handleGetAllGroups(req:Request,res:Response){
        const result=await lineItemsService.getAllGroups()
        if(!result){
            throw new AppError("Failed to fetch all Line Item Groups",500)
        }
        return res.status(200).json({
            message:"All Line Item Groups fetched successfully",
            success:true,
            data:result
        })
    }
    async handleGetGroupById(req:Request,res:Response){
        const {id}=req.params
        const result=await lineItemsService.getLineItemGroupById(id)    
        
        
        return res.status(200).json({
            message:"Line Item Group fetched successfully",
            success:true,
            data:result
        })
    }

    
//Line Items
   async handleCreateLineItem(req:Request,res:Response){
        const data=req.body
        const result=await lineItemsService.createLineItem(data)
        return res.status(201).json({
            message:"Line Item created successfully",
            success:true,
            data:result
        })
    }
    async handleUpdateLineItem(req:Request,res:Response){
        const {id}=req.params
        const data=req.body
        console.log("Line Item update data:",data)
        const result=await lineItemsService.updateLineItem(id,data)
        if(!result){
            throw new AppError("Failed to update Line Item",400)
        }
        return res.status(200).json({
            message:"Line Item updated successfully",
            success:true,
            data:result
        })
    }
    async handleGetLineItemsGroupById(req:Request,res:Response){
        const {groupId}=req.params
        
        const result=await lineItemsService.getLineItemsByGroupId(groupId)
        
        if(!result){
            throw new AppError("Failed to fetch Line Item Group by Id",500)
        }
        return res.status(200).json({
            message:"Line Item Group fetched successfully",
            success:true,
            data:result
        })
    }    
    
    async handleDeleteLineItem(req:Request,res:Response){
        const {id}=req.params
        const result=await lineItemsService.deleteLineItem(id)
        if(!result){
            throw new AppError("Failed to delete Line Item",400)
        }
        return res.status(200).json({
            message:"Line Item deleted successfully",
            success:true,
            data:result
        })
    }
    
    
}