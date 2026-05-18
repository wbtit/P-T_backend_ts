import { Request, Response } from "express";
import * as AuthService from "../services";
import { runIpGuard } from "../services/ipGuardService";
import { generateToken } from "../../../../config/utils/jwtutils";

export const handleSignup = async (req: Request, res: Response) => {
    const result = await AuthService.signup(req.body);
    res.status(200).json({ success: true, data: result });
}

export const handleSignin = async (req: Request, res: Response) => {
    const user = await AuthService.verifyCredentials(req.body);

    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip) || '';
    const userAgent = req.headers['user-agent'] || '';

    const guardResult = await runIpGuard({
        userId: user.id,
        ip,
        userAgent,
        userEmail: user.email || '',
        userName: user.username
    });

    if (guardResult.status === 'ALLOWED') {
        const token = generateToken(AuthService.toJwtPayload(user));
        return res.status(200).json({
            success: true,
            data: {
                token,
                user: AuthService.sanitizeUser(user)
            }
        });
    }

    return res.status(202).json({
        message: guardResult.message,
        challengeToken: guardResult.challengeToken,
        requiresVerification: true
    });
}

export const handleResetPassword=async(req:Request,res:Response)=>{
    const result = await AuthService.resetPassword(req.body);
    res.status(200).json({success:true,data:result});

}
