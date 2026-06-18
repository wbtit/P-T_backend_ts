import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import { AppError } from "../../../../config/utils/AppError";
import * as AuthService from "../services";
import prisma from "../../../../config/database/client";
import bcrypt from "bcrypt-ts";
import { runIpGuard } from "../services/ipGuardService";
import { generateToken } from "../../../../config/utils/jwtutils";
import { WHService } from "../../../workingHours/services/wh.services";

const whService = new WHService();

const sanitizeUser = <T extends { password?: string }>(user: T): Omit<T, "password"> => {
    const { password, ...safeUser } = user;
    return safeUser;
};

export const handleSignup = async(req:Request,res:Response)=>{
    const result = await AuthService.signup(req.body);
    res.status(200).json({success:true,data:result});
};

export const handleSignin = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // 1. Credentials verified FIRST before IP guard runs
    const user = await prisma.user.findUnique({
        where: { username },
    });
    if (!user) {
        throw new AppError("Invalid username or password", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError("Invalid username or password", 401);
    }

    // 2. IP extracted with x-forwarded-for split on comma, index [0]
    const forwarded = req.headers['x-forwarded-for'];
    let ip: string;
    if (typeof forwarded === 'string') {
      ip = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded)) {
      ip = forwarded[0].trim();
    } else {
      ip = req.ip || req.socket?.remoteAddress || '';
    }

    // Normalize IPv6 loopback to IPv4
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }

    // 3. UA extracted from req.headers['user-agent']
    const userAgent = req.headers["user-agent"];

    // 4. runIpGuard called
    const email = user.email || "";
    const guardResult = await runIpGuard(user.id, ip, userAgent, email, user.username);

    // 5. Response handling
    if (guardResult.status === "ALLOWED") {
        const tokenPayload = {
            id: user.id,
            email: user.email,
            username: user.username,
            connectionDesignerId: user.connectionDesignerId || null,
            departmentId: user.departmentId || null,
            role: user.role,
        };
        const token = generateToken(tokenPayload);

        res.status(200).json({
            success: true,
            data: {
                token,
                user: sanitizeUser(user),
            },
        });
    } else if (guardResult.status === "CHALLENGED") {
        // On CHALLENGED: 202 returned with { message, challengeToken, requiresVerification: true }
        res.status(202).json({
            success: true,
            data: {
                message: guardResult.message,
                challengeToken: guardResult.challengeToken,
                requiresVerification: true,
            },
        });
    } else {
        throw new AppError("Access denied", 403);
    }
};

export const handleChangePassword = async (req: AuthenticateRequest, res: Response) => {
    if (!req.user) throw new AppError("User not found", 404);
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json({ success: true, data: result });
};

export const handleLogout = async (req: AuthenticateRequest, res: Response) => {
    if (!req.user) {
        throw new AppError("User not found", 404);
    }
    
    // Pause all active tasks for the user upon logout
    await whService.pauseAllTasksForUser(req.user.id);
    
    // Here you might invalidate the token if there is a blacklist, 
    // but typically we just ask the client to drop it.
    res.status(200).json({
        success: true,
        message: "Logged out successfully and active tasks paused."
    });
};
