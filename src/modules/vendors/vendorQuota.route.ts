import { Router } from "express";
import z from "zod";

import { VendorQuotaController } from "./controller";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";

import {
  VendorQuotaSchema,
  updateVendorQuotaSchema,
} from "./dto";

const router = Router();
const quotaCtrl = new VendorQuotaController();

/**
 * ---------------------------------------------------------------------
 *  CREATE Vendor Quota
 * ---------------------------------------------------------------------
 */
router.post(
  "/",
  authMiddleware,
  validate({ body: VendorQuotaSchema }),
  asyncHandler(quotaCtrl.handleCreateQuota.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET ALL Vendor Quotas
 * ---------------------------------------------------------------------
 */
router.get(
  "/all",
  authMiddleware,
  asyncHandler(quotaCtrl.handleGetAllQuotas.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET Vendor Quota by ID
 * ---------------------------------------------------------------------
 */
router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(quotaCtrl.handleGetQuotaById.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET Vendor Quotas by Vendor ID
 * ---------------------------------------------------------------------
 */
router.get(
  "/vendor/:vendorId",
  authMiddleware,
  validate({
    params: z.object({ vendorId: z.string() }),
  }),
  asyncHandler(quotaCtrl.handleGetQuotasByVendorId.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  UPDATE Vendor Quota
 * ---------------------------------------------------------------------
 */
router.put(
  "/update/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: updateVendorQuotaSchema,
  }),
  asyncHandler(quotaCtrl.handleUpdateQuota.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  APPROVE Vendor Quota
 * ---------------------------------------------------------------------
 */
router.post(
  "/approve/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  asyncHandler(quotaCtrl.handleApproveQuota.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  DELETE Vendor Quota
 * ---------------------------------------------------------------------
 */
router.delete(
  "/id/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  asyncHandler(quotaCtrl.handleDeleteQuota.bind(quotaCtrl))
);

export default router;
