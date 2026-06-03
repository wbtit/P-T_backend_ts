import { Router } from "express";
import { handleVerifyChallenge } from "../controllers/challengeController";
import { asyncHandler } from "../../../../config/utils/asyncHandler";

const router = Router();

// POST /auth/verify-challenge -> No auth middleware needed as token validates identity
router.post("/verify-challenge", asyncHandler(handleVerifyChallenge));

export default router;
