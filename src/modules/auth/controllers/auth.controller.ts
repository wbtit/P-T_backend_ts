import { Request,Response } from "express";
import * as AuthService from './auth.services';
import {
    signupSchema,
    signinSchema,
    resetPasswordSchema
} from './auth.model'

export const handleSignup = async(req:Request,res:Response)=>{
    const result = await AuthService.signup(req.body);
    res.status(200).json({success:true,data:result});

}

export const handleSignin= async(req:Request,res:Response)=>{
    const result = await AuthService.signin(req.body);
    res.status(200).json({success:true,data:result});
}

export const handleResetPassword=async(req:Request,res:Response)=>{
    const result = await AuthService.resetPassword(req.body);
    res.status(200).json({success:true,data:result});

}