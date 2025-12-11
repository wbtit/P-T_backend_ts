import { getMEASTrendlineHandler, managerDashboardHandler, runBiasDetector, runEPSManually, runMEASManually } from "./controllers/measController";
import { Router } from "express";
import { runMEASMonthly } from "./controllers/measController";

const router = Router();

// Route to run MEAS calculation manually
router.post("/meas/run-manually", runMEASManually);
// Route to trigger monthly MEAS calculation
router.post("/meas/run-monthly", runMEASMonthly);
router.post("/manager/bias", runBiasDetector);
router.get("/admin/analytics/meas/trendline", getMEASTrendlineHandler);
router.get("/admin/analytics/manager/dashboard", managerDashboardHandler);
router.post("/admin/analytics/employee/eps", runEPSManually);





export { router as analyticsScoresRouter };