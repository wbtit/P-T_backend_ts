import { Router } from "express";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import { DashBoradData } from "./dashBoardData";
import { clientAdminDashBoard } from "./clientAdminDashBoard";
import { clientDashBoard } from "./clientDashBoard";
import { hrDashBoard } from "./hrDashBoard";
import { departmentManagerDashBoard } from "./departmentManagerDashBoard";
import { projectManagerDashBoard } from "./projectManagerDashBoard";

const router = Router();

/**
 * ---------------------------------------------------------------------
 *  GET Dashboard Data
 * ---------------------------------------------------------------------
 */
router.get("/", authMiddleware, asyncHandler(DashBoradData));
router.get("/clientAdmin", authMiddleware, asyncHandler(clientAdminDashBoard));
router.get("/client", authMiddleware, asyncHandler(clientDashBoard));
router.get("/hr", authMiddleware, asyncHandler(hrDashBoard));
router.get(
  "/departmentManager",
  authMiddleware,
  asyncHandler(departmentManagerDashBoard)
);
router.get(
  "/projectManager",
  authMiddleware,
  asyncHandler(projectManagerDashBoard)
);

export default router;
