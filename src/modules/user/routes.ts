import { UserController } from "./controller";
import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import { FetchUserSchema } from "./dtos";
const userCtrl = new UserController();
const router = Router();

router.get("/me",
     authMiddleware, 
     validate({ body: FetchUserSchema }), 
     asyncHandler(userCtrl.handleGetUserByToken).bind(userCtrl));

export default router;