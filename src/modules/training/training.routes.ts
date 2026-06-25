import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { roleGuard } from "../../middleware/roleGuard"; 
import { raiseTrainingRequestDto, approveTrainingRequestDto, rejectTrainingRequestDto } from "./training.dto";
import { TrainingService } from "./training.service";
import { asyncHandler } from "../../config/utils/asyncHandler"; 
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { TrainingController } from "./training.controller";
import { createTrainingBatchDto } from "./training.dto";

const router = Router();
const trainingController = new TrainingController();

const validateUuidParam = (paramName: string) => {
  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params[paramName])) {
      return res.status(400).json({ status: "error", message: `Invalid ${paramName} format` });
    }
    next();
  };
};


const TRAINING_APPROVAL_ROLES = [
  "PROJECT_MANAGER", "DEPT_MANAGER", "DEPUTY_MANAGER", 
  "OPERATION_EXECUTIVE", "ADMIN"
];

router.post(
  "/request",
  authMiddleware,
  validate({ body: raiseTrainingRequestDto }),
  asyncHandler(async (req, res) => {
    await trainingController.raiseTrainingRequest(req as AuthenticateRequest, res);
  })
);

router.get(
  "/pending",
  authMiddleware,
  roleGuard(TRAINING_APPROVAL_ROLES),
  asyncHandler(async (req, res) => {
    await trainingController.getPendingRequests(req as AuthenticateRequest, res);
  })
);

router.patch(
  "/:requestId/approve",
  authMiddleware,
  roleGuard(TRAINING_APPROVAL_ROLES),
  validate({ body: approveTrainingRequestDto }),
  asyncHandler(async (req, res) => {
    await trainingController.approveTrainingRequest(req as AuthenticateRequest, res);
  })
);

router.patch(
  "/:requestId/reject",
  authMiddleware,
  roleGuard(TRAINING_APPROVAL_ROLES),
  validate({ body: rejectTrainingRequestDto }),
  asyncHandler(async (req, res) => {
    await trainingController.rejectTrainingRequest(req as AuthenticateRequest, res);
  })
);

router.get(
  "/:taskId/variance",
  authMiddleware,
  roleGuard(TRAINING_APPROVAL_ROLES),
  asyncHandler(async (req, res) => {
    await trainingController.getVariance(req as AuthenticateRequest, res);
  })
);

router.get(
  "/batches/suggest",
  authMiddleware,
  roleGuard(TRAINING_APPROVAL_ROLES),
  asyncHandler(async (req, res) => {
    const { departmentId } = req.query;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!departmentId || typeof departmentId !== "string" || !uuidRegex.test(departmentId)) {
      return res.status(400).json({ status: "error", message: "Invalid or missing departmentId" });
    }
    await trainingController.suggestBatchableRequests(req as AuthenticateRequest, res);
  })
);

router.post(
  "/batches",
  authMiddleware,
  roleGuard(TRAINING_APPROVAL_ROLES),
  validate({ body: createTrainingBatchDto }),
  asyncHandler(async (req, res) => {
    await trainingController.createTrainingBatch(req as AuthenticateRequest, res);
  })
);

router.patch(
  "/batches/:batchId/complete",
  authMiddleware,
  validateUuidParam("batchId"),
  asyncHandler(async (req, res) => {
    await trainingController.completeTrainerSession(req as AuthenticateRequest, res);
  })
);

export default router;
