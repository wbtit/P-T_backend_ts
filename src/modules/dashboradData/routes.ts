import { Router } from "express";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import { DashBoradData } from "./dashBoardData";
import { clientAdminDashBoard } from "./clientAdminDashBoard";

const router = Router();

/**
 * ---------------------------------------------------------------------
 *  GET Dashboard Data
 * ---------------------------------------------------------------------
 */
router.get(
  "/",
  authMiddleware,
  asyncHandler(DashBoradData)
);
router.get(
  "/clientAdmin",
  authMiddleware,
  asyncHandler(clientAdminDashBoard)
);

export default router;``