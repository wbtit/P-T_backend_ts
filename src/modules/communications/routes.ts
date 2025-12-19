import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import z from "zod";

import { ClientCommunicationController } from "./controllers";


const communicationCtrlr = new ClientCommunicationController();
const router = Router();

/**
 * Create communication
 */
router.post(
  "/",
  authMiddleware,
  asyncHandler(communicationCtrlr.create).bind(communicationCtrlr)
);

/**
 * List communications
 */
router.get(
  "/",
  authMiddleware,
  asyncHandler(communicationCtrlr.list).bind(communicationCtrlr)
);

/**
 * Update communication
 */
router.patch(
  "/:id",
  authMiddleware,
  asyncHandler(communicationCtrlr.update).bind(communicationCtrlr)
);

/**
 * Mark communication as complete
 */
router.patch(
  "/complete/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  asyncHandler(communicationCtrlr.complete).bind(communicationCtrlr)
);

//GET /communications/dashboard/my-followups
router.get(
  "/dashboard/my-followups",
  authMiddleware,
  asyncHandler(communicationCtrlr.getMyFollowUps).bind(communicationCtrlr)
)

export default router;
