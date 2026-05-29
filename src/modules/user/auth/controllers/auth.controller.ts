import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { AppError } from "../../../../config/utils/AppError";
import * as AuthService from "../services"



export const handleSignup = async(req:Request,res:Response)=>{
    const result = await AuthService.signup(req.body);
    res.status(200).json({success:true,data:result});

}

export const handleSignin= async(req:Request,res:Response)=>{
    const result = await AuthService.signin(req.body);
    
    res.status(200).json({success:true,data:result});
}

// REMOVED: Self-service password reset not required for this platform.
// Admin handles password resets via PATCH /admin/users/:userId/reset-password
/*
export const handleResetPassword=async(req:Request,res:Response)=>{
    const result = await AuthService.resetPassword(req.body);
    res.status(200).json({success:true,data:result});

}

export const handleForgotPassword=async(req:Request,res:Response)=>{
    const result = await AuthService.forgotPassword(req.body.username);
    res.status(200).json({success:true,data:result});
}
*/

export const handleChangePassword = async (req: AuthenticateRequest, res: Response) => {
    if (!req.user) throw new AppError("User not found", 404);
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json({ success: true, data: result });
};
