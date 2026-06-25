import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { roleGuard } from "../../middleware/roleGuard"; 
import { raiseTrainingRequestDto, approveTrainingRequestDto, rejectTrainingRequestDto } from "./training.dto";
import { TrainingService } from "./training.service";
import { asyncHandler } from "../../config/utils/asyncHandler"; 
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { TrainingController } from "./training.controller";

const router = Router();
const trainingController = new TrainingController();


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

export default router;
