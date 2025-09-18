import express from "express";
import { EstManageController } from "./management/controllers";
import authMiddleware from "../../middleware/authMiddleware";
import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import { z } from "zod";
import { estimationUploads } from "../../utils/multerUploader.util";
import { EstimationSchema,UpdateEstimationDto } from "./management/dtos";

const router = express.Router();


// ===========================================================
// ESTIMATION MANAGEMENT ROUTES
// ===========================================================

const estController = new EstManageController();

// Create Estimation
router.post(
  "/estimations",
  authMiddleware,
  validate({ body: EstimationSchema }),
  estimationUploads.array("files"),
  asyncHandler(estController.handleCreateEstimation.bind(estController))
);

// Get All Estimations
router.get(
  "/estimations",
  authMiddleware,
  asyncHandler(estController.handleGetAll.bind(estController))
);

// Get Estimation by ID
router.get(
  "/estimations/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(estController.handleGetById.bind(estController))
);

// Get Estimations by Creator ID (logged-in user)
router.get(
  "/estimations/user/me",
  authMiddleware,
  asyncHandler(estController.handleGetByCreatoeId.bind(estController))
);

// Update Estimation
router.put(
  "/estimations/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateEstimationDto,
  }),
  asyncHandler(estController.handleUpdate.bind(estController))
);

// Delete Estimation
router.delete(
  "/estimations/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(estController.handleDelete.bind(estController))
);

// Update Estimation Status
router.patch(
  "/estimations/:id/status/:status",
  authMiddleware,
  validate({
    params: z.object({
      id: z.string(),
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED"]), // Adjust based on your EstimationStatus enum
    }),
  }),
  asyncHandler(estController.handleUpdateStatus.bind(estController))
);

// Set Estimation Price
router.post(
  "/estimations/:id/price",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  asyncHandler(estController.handleSetPrice.bind(estController))
);

// Get File (download)
router.get(
  "/estimations/:estimationId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      estimationId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(estController.handleGetFile.bind(estController))
);

// View File (streaming)
router.get(
  "/viewFile/:estimationId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      estimationId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(estController.handleViewFile.bind(estController))
);

export default router;
