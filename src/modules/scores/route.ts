import { getMEASTrendlineHandler, managerDashboardHandler, runBiasDetector, runEPSForAllManually, runEPSManually, runMEASManually, runTESForAllManually, runTESForTeamManually } from "./controllers/measController";
import { Router } from "express";
import { runMEASMonthly } from "./controllers/measController";
import authMiddleware from "../../middleware/authMiddleware";
import roleMiddleware from "../../middleware/roleMiddleware";

const router = Router();

// Calculate MEAS for one manager-project pair using request body values.
router.post("/meas/run-manually", authMiddleware,runMEASManually);

// Trigger batch MEAS computation for all valid manager-project pairs.
router.post("/meas/run-monthly", authMiddleware, runMEASMonthly);

// Admin/System Admin trigger for MEAS batch run across all manager-project pairs.
router.post("/admin/analytics/meas/run-all", authMiddleware, runMEASMonthly);

// Calculate manager bias score (optionally scoped by project).
router.post("/manager/bias", authMiddleware, runBiasDetector);

// Return MEAS trendline analytics for a manager-project pair.
router.post("/admin/analytics/meas/trendline", authMiddleware, getMEASTrendlineHandler);

// Return aggregated manager analytics dashboard data.
router.post("/admin/analytics/manager/dashboard", authMiddleware, managerDashboardHandler);

// Calculate EPS for one employee for a specific year/month.
router.post("/admin/analytics/employee/eps", authMiddleware, runEPSManually);

// Admin/System Admin trigger for EPS batch calculation for all eligible employees.
// Optional body supports explicit { year, month }.
router.post("/admin/analytics/employee/eps/run-all", authMiddleware, runEPSForAllManually);

// Admin/System Admin trigger for TES calculation for a single team.
// Optional body supports explicit { year, month } and requires { teamId }.
router.post("/admin/analytics/team-efficiency/run-team", authMiddleware, runTESForTeamManually);

// Admin/System Admin trigger for TES batch calculation for all active teams.
// Optional body supports explicit { year, month }.
router.post("/admin/analytics/team-efficiency/run-all", authMiddleware,  runTESForAllManually);





export { router as analyticsScoresRouter };
