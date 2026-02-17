import { UserService } from "./services";
import { Request,Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { mapUploadedFiles } from "../uploads/fileUtil";
import { AppError } from "../../config/utils/AppError";

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

    async handleUpdateMyProfilePic(req: AuthenticateRequest, res: Response) {
        const user = req.user;
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const uploadedFiles = mapUploadedFiles(
            (req.files as Express.Multer.File[]) || [],
            "userprofiles"
        );

        const profilePic = uploadedFiles[0]?.path;
        if (!profilePic) {
            throw new AppError("Profile picture is required", 400);
        }

        const result = await userService.updateProfilePic(user.id, profilePic);
        return res.status(200).json({
            status: "success",
            data: result,
        });
    }
}
