import { getMEASTrendlineHandler, managerDashboardHandler, runBiasDetector, runEPSManually, runMEASManually } from "./controllers/measController";
import { Router } from "express";
import { runMEASMonthly } from "./controllers/measController";
import authMiddleware from "../../middleware/authMiddleware";

const router = Router();

// Route to run MEAS calculation manually
router.post("/meas/run-manually", authMiddleware,runMEASManually);
// Route to trigger monthly MEAS calculation
router.post("/meas/run-monthly", authMiddleware, runMEASMonthly);
router.post("/manager/bias", authMiddleware, runBiasDetector);
router.get("/admin/analytics/meas/trendline", authMiddleware, getMEASTrendlineHandler);
router.get("/admin/analytics/manager/dashboard", authMiddleware, managerDashboardHandler);
router.post("/admin/analytics/employee/eps", authMiddleware, runEPSManually);





export { router as analyticsScoresRouter };