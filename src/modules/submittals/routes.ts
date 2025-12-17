import { Router } from "express";
import { SubmittalController,SubmittalResponseController } from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import {
  createSubmittalsDto,
  updateSubmittalsDto,
  createSubmittalsResponseDto
} from "./dtos";
import {
  submittalUploads,
  submittalResponseUploads,
} from "../../utils/multerUploader.util";
import z from "zod";

const router = Router();
const submittalController = new SubmittalController();
const submittalResponseController = new SubmittalResponseController();

// ===========================================================
// SUBMITTAL ROUTES
// ===========================================================

router.post(
  "/",
  authMiddleware,
  submittalUploads.array("files"),
  validate({ body: createSubmittalsDto }),
  
  submittalController.handleCreateSubmittal.bind(submittalController)
);

router.put(
  "/:id",
  authMiddleware,
  submittalUploads.array("files"),
  validate({
    params: z.object({ id: z.string() }),
    body: updateSubmittalsDto,
  }),
  
  submittalController.handleUpdateSubmittal.bind(submittalController)
);

router.get(
  "/sent",
  authMiddleware,
  submittalController.handleSent.bind(submittalController)
);

router.get(
  "/received",
  authMiddleware,
  submittalController.handleReceived.bind(submittalController)
);

router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  submittalController.handleGetSubmittalById.bind(submittalController)
);

router.get(
  "/project/:projectId",
  authMiddleware,
  validate({ params: z.object({ projectId: z.string() }) }),
  submittalController.handleFindByProject.bind(submittalController)
);

router.get(
  "/:submittalId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      submittalId: z.string(),
      fileId: z.string(),
    }),
  }),
  submittalController.handleGetFile.bind(submittalController)
);

router.get(
  "/viewFile/:submittalId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      submittalId: z.string(),
      fileId: z.string(),
    }),
  }),
  submittalController.handleViewFile.bind(submittalController)
);

// ===========================================================
// SUBMITTAL RESPONSE ROUTES
// ===========================================================

router.post(
  "/:submittalId/responses",
  authMiddleware,
  submittalResponseUploads.array("files"),
  validate({
    params: z.object({ submittalId: z.string() }),
    body: createSubmittalsResponseDto,
  }),
  
  submittalResponseController.handleCreateResponse.bind(
    submittalResponseController
  )
);

router.patch(
  "/responses/:id/status",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: z.object({ status: z.string() }), // enforce State enum if needed
  }),
  submittalResponseController.handleUpdateStatus.bind(
    submittalResponseController
  )
);

router.get(
  "/responses/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  submittalResponseController.handleGetResponseById.bind(
    submittalResponseController
  )
);
router.get(
  "/responses/:responseId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string(),
      fileId: z.string(),
    }),
  }),
  submittalResponseController.handleGetFile.bind(submittalResponseController)
);

router.get(
  "/response/viewFile/:responseId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string(),
      fileId: z.string(),
    }),
  }),
  submittalResponseController.handleViewFile.bind(submittalResponseController)
);

export default router;
