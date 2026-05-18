import { Router } from "express";
import { getAdminAnalytics, getMyLoginHistory } from "../controllers/analyticsController";
import { asyncHandler } from "../../../../config/utils/asyncHandler";
import authMiddleware from "../../../../middleware/authMiddleware";

const router = Router();

router.get("/analytics/admin", authMiddleware, asyncHandler(getAdminAnalytics));
router.get("/analytics/me", authMiddleware, asyncHandler(getMyLoginHistory));

export default router;
