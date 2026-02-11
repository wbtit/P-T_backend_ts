import { Router } from "express";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import { DashBoradData } from "./dashBoardData";
import { clientAdminDashBoard } from "./clientAdminDashBoard";
import { clientDashBoard } from "./clientDashBoard";

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
router.get(
  "/client",
  authMiddleware,
  asyncHandler(clientDashBoard)
);

export default router;``