import { Router } from "express";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import { DashBoradData } from "./dashBoardData";

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

export default router;``