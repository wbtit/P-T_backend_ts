import { Router } from "express";
import {
    handleResetPassword,
    handleSignin,
    handleSignup
} from './auth.controller'
import { asyncHandler } from "../../config/utils/asyncHandler";
import { validate } from "../../middlewares/validate";
import { 
    signupSchema,
    signinSchema,
    resetPasswordSchema
 } from "./auth.model";
import authMiddleware from "../../middlewares/authMiddleware";
const router =Router();

router.post("/signup",validate(signupSchema),asyncHandler(handleSignup));
router.post("/signin",validate(signinSchema),asyncHandler(handleSignin))
router.patch("/reset-password",authMiddleware,validate(resetPasswordSchema),asyncHandler(handleResetPassword))

export default router;