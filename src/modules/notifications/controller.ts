import { NotificationService } from "./service";
import { Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
const notifyService = new NotificationService()

export class NotificationController{
    async get(req:AuthenticateRequest,res:Response){
        const user=req.user
        if(user){
            const  notifications = await notifyService.get(user.id)

            res.status(200).json({
                message:"Notifications fetched",
                data:notifications
            })
        }
        
    }
    async update(req:AuthenticateRequest,res:Response){
        const {notificationId}=req.params
        const update = await notifyService.update(notificationId);
        res.status(200).json({
                message:"Notifications fetched",
                data:update
            })
    }
}
