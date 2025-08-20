import { Router } from "express";
import {
    handleResetPassword,
    handleSignin,
    handleSignup
} from './controllers'
import { asyncHandler } from "../../../config/utils/asyncHandler"; 
import validate from "../../../middleware/validate";
import authMiddleware from "../../../middleware/authMiddleware";
import { 
    signinSchema,
    resetPasswordSchema
 } from "./dtos";
import { createUserSchema } from "../dtos";
const router =Router();

// Register
router.post(
  "/register",
  validate(createUserSchema), // instead of createUserSchema if different
  asyncHandler(handleSignup)
);

// Login
router.post(
  "/login",
  validate(signinSchema),
  asyncHandler(handleSignin)
);

// Reset password (protected)
router.patch(
  "/reset-password",
  authMiddleware,
  validate(resetPasswordSchema),
  asyncHandler(handleResetPassword)
);


export default router;