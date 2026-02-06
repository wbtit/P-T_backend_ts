import { Router } from "express";
import { ConnectionDesignerQuotaController } from "./controllers";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import { connectionDesignerFilesUploads } from "../../utils/multerUploader.util";
import z from "zod";

import {
  ConnectionDesignerQuotaSchema,
  updateConnectionDesignerQuotaSchema,
} from "./dtos";

const router = Router();
const quotaCtrl = new ConnectionDesignerQuotaController();

/**
 * ---------------------------------------------------------------------
 *  CREATE QUOTA
 * ---------------------------------------------------------------------
 */
router.post(
  "/",
  authMiddleware,
  connectionDesignerFilesUploads.array("files"),
  validate({ body: ConnectionDesignerQuotaSchema }),
  asyncHandler(quotaCtrl.handleCreateQuota.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET ALL QUOTAS
 * ---------------------------------------------------------------------
 */
router.get(
  "/all",
  authMiddleware,
  asyncHandler(quotaCtrl.handleGetAllQuotas.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET QUOTA BY ID
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
 *  GET QUOTAS BY DESIGNER ID
 * ---------------------------------------------------------------------
 */
router.get(
  "/designer/:designerId",
  authMiddleware,
  validate({
    params: z.object({ designerId: z.string() }),
  }),
  asyncHandler(quotaCtrl.handleGetQuotasByDesignerId.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  UPDATE QUOTA
 * ---------------------------------------------------------------------
 */
router.put(
  "/update/:id",
  authMiddleware,
  connectionDesignerFilesUploads.array("files"),
  validate({
    params: z.object({ id: z.string() }),
    body: updateConnectionDesignerQuotaSchema,
  }),
  asyncHandler(quotaCtrl.handleUpdateQuota.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  APPROVE QUOTA
 * ---------------------------------------------------------------------
 */
router.put(
  "/approve/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(quotaCtrl.handleApproveQuota.bind(quotaCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  DELETE QUOTA
 * ---------------------------------------------------------------------
 */
router.delete(
  "/delete/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(quotaCtrl.handleDeleteQuota.bind(quotaCtrl))
);

export default router;
