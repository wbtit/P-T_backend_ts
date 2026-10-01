import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import { roleGuard } from "../../middleware/roleGuard";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import { WprController } from "./wpr.controller";
import { WprProjectParamsSchema, WprReportQuerySchema, WprDeliveriesQuerySchema } from "./wpr.dto";

const router = Router();
const wprController = new WprController();

/**
 * Coarse role gate — who may reach a WPR endpoint at all. Fine-grained,
 * per-project scoping (own project / own department / own fabricator) is
 * enforced separately in wpr.service.ts (assertProjectAccess), since that
 * needs a DB lookup the route layer can't do.
 */
const WPR_ALLOWED_ROLES = [
  "ADMIN",
  "OPERATION_EXECUTIVE",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "PROJECT_MANAGER",
  "DEPT_MANAGER",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_ESTIMATOR",
  "CLIENT_ACCOUNTANT",
];

router.get(
  "/projects/:projectId/weeks",
  authMiddleware,
  roleGuard(WPR_ALLOWED_ROLES),
  validate({ params: WprProjectParamsSchema }),
  asyncHandler(wprController.handleGetWeeks.bind(wprController))
);

router.get(
  "/projects/:projectId/report.json",
  authMiddleware,
  roleGuard(WPR_ALLOWED_ROLES),
  validate({ params: WprProjectParamsSchema, query: WprReportQuerySchema }),
  asyncHandler(wprController.handleGetReportJson.bind(wprController))
);

router.get(
  "/projects/:projectId/report.pdf",
  authMiddleware,
  roleGuard(WPR_ALLOWED_ROLES),
  validate({ params: WprProjectParamsSchema, query: WprReportQuerySchema }),
  asyncHandler(wprController.handleGetReportPdf.bind(wprController))
);

const WPR_DELIVERIES_ROLES = ["ADMIN", "OPERATION_EXECUTIVE", "PROJECT_MANAGER_OFFICER", "DEPUTY_MANAGER"];

router.get(
  "/deliveries",
  authMiddleware,
  roleGuard(WPR_DELIVERIES_ROLES),
  validate({ query: WprDeliveriesQuerySchema }),
  asyncHandler(wprController.handleListDeliveries.bind(wprController))
);

export default router;
