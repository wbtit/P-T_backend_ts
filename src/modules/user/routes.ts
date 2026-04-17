import { UserController } from "./controller";
import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import { asyncHandler } from "../../config/utils/asyncHandler";
import { userProfilePicUploads } from "../../utils/multerUploader.util";
import { scanUploadMiddleware } from "../../middleware/scanUpload.middleware";

const userCtrl = new UserController();
const router = Router();

router.get(
  "/me",
  authMiddleware,
  asyncHandler(userCtrl.handleGetUserByToken.bind(userCtrl))
);

router.patch(
  "/me/profile-pic",
  authMiddleware,
  userProfilePicUploads.array("files", 1),
  scanUploadMiddleware,
  asyncHandler(userCtrl.handleUpdateMyProfilePic.bind(userCtrl))
);

router.get(
  "/getAllUsers",
  authMiddleware,
  asyncHandler(userCtrl.handleGetAllUsers.bind(userCtrl))
);

export default router;
