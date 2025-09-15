import { UserService } from "./services";
import { Request,Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";

const userService = new UserService();
export class UserController{
    async handleGetUserByToken(req: AuthenticateRequest, res: Response) {
        const user = req.user;
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userData = await userService.read({ id: user.id });
        res.status(200).json({
            status: 'success',
            data: userData,
        });
    }
}