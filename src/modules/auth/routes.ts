import { Router } from "express";
import {
    handleResetPassword,
    handleSignin,
    handleSignup
} from './controllers'
import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { 
    signupSchema,
    signinSchema,
    resetPasswordSchema
 } from "./dtos";

const router =Router();

router.post("/signup",validate(signupSchema),asyncHandler(handleSignup));
router.post("/signin",validate(signinSchema),asyncHandler(handleSignin))
router.patch("/reset-password",authMiddleware,validate(resetPasswordSchema),asyncHandler(handleResetPassword))

export default router;