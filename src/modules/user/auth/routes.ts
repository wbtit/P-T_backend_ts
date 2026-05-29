import { Router } from "express";
import {
    handleSignin,
    handleSignup,
    handleChangePassword
} from './controllers'
import { asyncHandler } from "../../../config/utils/asyncHandler"; 
import validate from "../../../middleware/validate";
import authMiddleware from "../../../middleware/authMiddleware";
import { 
    signinSchema,
    publicSignupSchema,
    changePasswordSchema
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

// Change password (protected)
router.patch(
  "/change-password",
  authMiddleware,
  validate({ body: changePasswordSchema }),
  asyncHandler(handleChangePassword)
);


export default router;
