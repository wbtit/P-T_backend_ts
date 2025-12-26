import { Response,Request } from "express";
import { EstimationManageService } from "../services";
import { mapUploadedFiles } from "../../../uploads/fileUtil";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { AppError } from "../../../../config/utils/AppError";
import { EstimationStatus } from "@prisma/client";

const estService= new EstimationManageService()

export class EstManageController{
    async handleCreateEstimation(req:AuthenticateRequest,res:Response){
       const user= req.user
       const uploadedFiles = mapUploadedFiles(
        req.files as Express.Multer.File[] || [],
        "estimations"
       )
       if(user?.id){
           const estimation = await estService.create({
          ...req.body,
          files:uploadedFiles
          },user?.id)

          res.status(200).json({
            message:"Estimation created",
            success:true,
            data:estimation
        })
       }  
    }
    async handleGetAll(req:Request,res:Response){
        const estimations= await estService.getAll();
        if(estimations.length === 0){
            return res.status(200).json({
                message:") estimations",
                success:true,
                data:estimations
            })
        }
        res.status(200).json({
            message:"Estimations Fetched",
            success:true,
            data:estimations
        })
    }
    async handleGetById(req:Request,res:Response){
        const {id}=req.params
        const estimation = await estService.getById(id)
        if(!estimation){
            throw new AppError("failed to fetch",400)
        }
        res.status(200).json({
            message:"Estimation fetched",
            success:true,
            data:estimation
        })
    }
    async handleGetByCreatoeId(req:AuthenticateRequest,res:Response){
        const user=req?.user
        if(!user){
            throw new AppError("User ID is required")
        }
        const estimation = await estService.getByCreatorId(user.id)
        res.status(200).json({
            message:"Estimation fetched",
            success:true,
            data:estimation
        })
    }
    async handleUpdate(req:Request,res:Response){
        const{id}=req.params
        const data= req.body
        const estimation= await estService.update(id,data)
        res.status(200).json({
            message:"Estimation fetched",
            success:true,
            data:estimation
        })
    }
    async handleDelete(req:Request,res:Response){
        const{id}=req.params
        const estimation = await estService.delete(id)
        res.status(200).json({
            message:"Estimation fetched",
            success:true,
            data:estimation
        })
    }
    async handleUpdateStatus(req:Request,res:Response){
        const {id,status}=req.params
        
        const estimation = await estService.updateStatus(id,status as EstimationStatus)
        res.status(200).json({
            message:"Estimation fetched",
            success:true,
            data:estimation
        })
    }
    async handleSetPrice(req:Request,res:Response){
        const{id}=req.params
        const price = req.body
        const estimation = await estService.setPrice(id,price)
        res.status(200).json({
            message:"Estimation fetched",
            success:true,
            data:estimation
        })
    }
    async handleViewFile(req:Request,res:Response){
        const{estimationId,fileId}=req.params
        await estService.viewFile(estimationId,fileId,res)

    }
    async handleGetFile(req:Request,res:Response){
        const{estimationId,fileId}=req.params
        const estimation = await estService.getFile(estimationId,fileId)
        res.status(200).json({
            message:"Estimation Files fetched",
            success:true,
            data:estimation
        })
    }
}