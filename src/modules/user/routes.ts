import { UserController } from "./controller";
import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import { FetchUserSchema } from "./dtos";
import { userProfilePicUploads } from "../../utils/multerUploader.util";
const userCtrl = new UserController();
const router = Router();

router.get("/me",
     authMiddleware, 
     asyncHandler(userCtrl.handleGetUserByToken).bind(userCtrl));

router.patch(
     "/me/profile-pic",
     authMiddleware,
     userProfilePicUploads.array("files", 1),
     asyncHandler(userCtrl.handleUpdateMyProfilePic).bind(userCtrl)
);

router.get(
     "/getAllUsers",
     authMiddleware,
     asyncHandler(userCtrl.handleGetAllUsers).bind(userCtrl)
)

export default router;
