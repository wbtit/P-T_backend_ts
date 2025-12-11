import { runBiasDetector, runMEASManually } from "./controllers/measController";
import { Router } from "express";
import { runMEASMonthly } from "./controllers/measController";

const router = Router();

// Route to run MEAS calculation manually
router.post("/meas/run-manually", runMEASManually);
// Route to trigger monthly MEAS calculation
router.post("/meas/run-monthly", runMEASMonthly);
router.post("/manager/bias", runBiasDetector);


export { router as analyticsScoresRouter };