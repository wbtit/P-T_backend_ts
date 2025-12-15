import express from "express";
import { EstManageController } from "./management/controllers";
import authMiddleware from "../../middleware/authMiddleware";
import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import { z } from "zod";
import { estimationUploads,estimationTaskUploads } from "../../utils/multerUploader.util";
import { EstimationSchema,UpdateEstimationDto } from "./management/dtos";
import { EstimationTaskDTO,UpdateEstimationTask } from "./estimationTask/dtos";
import { EstimationTaskController } from "./estimationTask/controllers/estTask.controller";
import { TaskStatus } from "@prisma/client";

const router = express.Router();


// ===========================================================
// ESTIMATION MANAGEMENT ROUTES
// ===========================================================

const estController = new EstManageController();

// Create Estimation
router.post(
  "/estimations",
  authMiddleware,
  estimationUploads.array("files"),
  validate({ body: EstimationSchema }),
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
      status: z.enum(TaskStatus),
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

// ===========================================================
// ESTIMATION TASKS ROUTES
// ===========================================================
const taskController = new EstimationTaskController();
// Zod Schemas
const ParamsWithId = z.object({ id: z.string() });
// Create Estimation Task
router.post(
  "/estimation-tasks",
  authMiddleware,
  estimationTaskUploads.array("files"),
  validate({ body: EstimationTaskDTO }),
  asyncHandler(taskController.handleCreateEstimationTask.bind(taskController))
);

// Review Estimation Task
router.patch(
  "/estimation-tasks/:id/review",
  authMiddleware,
  validate({
    params: ParamsWithId,
    body: UpdateEstimationTask,
  }),
  asyncHandler(taskController.handleReviewEstimationTask.bind(taskController))
);

// Get All Tasks (Admins only)
router.get(
  "/estimation-tasks",
  authMiddleware,
  asyncHandler(taskController.handleGetAllEstimationTasks.bind(taskController))
);

// Get My Assigned Tasks
router.get(
  "/estimation-tasks/my",
  authMiddleware,
  asyncHandler(taskController.handleGetMyEstimationTasks.bind(taskController))
);
// Get My All Assigned Tasks
router.get(
  "/estimation-tasks/my/all",
  authMiddleware,
  asyncHandler(taskController.handleGetMyAllEstimationTasks.bind(taskController))
);

// Get Task By ID
router.get(
  "/estimation-tasks/:id",
  authMiddleware,
  validate({ params: ParamsWithId }),
  asyncHandler(taskController.handleGetEstimationTaskById.bind(taskController))
);

// Update Estimation Task
router.patch(
  "/estimation-tasks/:id",
  authMiddleware,
  validate({
    params: ParamsWithId,
    body: UpdateEstimationTask,
  }),
  asyncHandler(taskController.handleUpdateEstimationTask.bind(taskController))
);

// Delete Estimation Task
router.delete(
  "/estimation-tasks/:id",
  authMiddleware,
  validate({ params: ParamsWithId }),
  asyncHandler(taskController.handleDeleteEstimationTask.bind(taskController))
);
export default router;
