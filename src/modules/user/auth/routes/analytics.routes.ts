import { Router } from "express";
import { getAdminAnalytics, getMyLoginHistory, getUserRbaAnalytics, getIpChangeAnalytics } from "../controllers/analyticsController";
import { asyncHandler } from "../../../../config/utils/asyncHandler";
import authMiddleware from "../../../../middleware/authMiddleware";
import roleMiddleware from "../../../../middleware/roleMiddleware";

const router = Router();

// GET /auth/analytics/admin -> Admin role required
router.get("/admin", authMiddleware, roleMiddleware(["ADMIN","DEPUTY_MANAGER","OPERATION_EXECUTIVE","HUMAN_RESOURCE"]), asyncHandler(getAdminAnalytics));

// GET /auth/analytics/me -> Auth token required
router.get("/me", authMiddleware, asyncHandler(getMyLoginHistory));

// GET /auth/analytics/user/:userId -> Admin role required to inspect individual user RBA data
router.get("/user/:userId", authMiddleware, roleMiddleware(["ADMIN","DEPUTY_MANAGER","OPERATION_EXECUTIVE","HUMAN_RESOURCE"]), asyncHandler(getUserRbaAnalytics));

// GET /auth/analytics/ip-changes -> Admin role required to inspect users whose IP has changed
router.get("/ip-changes", authMiddleware, roleMiddleware(["ADMIN","DEPUTY_MANAGER","OPERATION_EXECUTIVE","HUMAN_RESOURCE"]), asyncHandler(getIpChangeAnalytics));

export default router;
