import { Router } from "express";
import { verifyChallenge } from "../controllers/challengeController";
import { asyncHandler } from "../../../../config/utils/asyncHandler";

const router = Router();

router.post("/verify-challenge", asyncHandler(verifyChallenge));

export default router;
