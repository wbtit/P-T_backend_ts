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
    resetPasswordSchema,
    publicSignupSchema
 } from "./dtos";
const router =Router();

// Register
router.post(
  "/register",
  validate({ body: publicSignupSchema }),
  asyncHandler(handleSignup)
);

// Login
router.post(
  "/login",
  validate({ body: signinSchema }),
  asyncHandler(handleSignin)
);

// Reset password (protected)
router.patch(
  "/reset-password",
  authMiddleware,
  validate({ body: resetPasswordSchema }),
  asyncHandler(handleResetPassword)
);


export default router;
