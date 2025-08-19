import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";
import { Request, Response, NextFunction } from 'express';

export const validate=(Schema:ZodSchema)=>(req:Request,res:Response,next:NextFunction)=>{
    const parsed = Schema.safeParse(req.body);
    if(!parsed.success) throw new AppError(parsed.error.message,400);

    req.body=parsed.data;
    next();
}