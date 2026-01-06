import { Router } from "express";
import {
  SubmittalController,
  SubmittalResponseController,
} from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import {
  createSubmittalsDto,
  createSubmittalsResponseDto,
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
// SUBMITTALS (IDENTITY + VERSIONING)
// ===========================================================

// CREATE SUBMITTAL + INITIAL VERSION (v1)
router.post(
  "/",
  authMiddleware,
  submittalUploads.array("files"),
  validate({ body: createSubmittalsDto }),
  submittalController.handleCreateSubmittal.bind(submittalController)
);

// CREATE NEW VERSION (CONTENT UPDATE)
router.post(
  "/:id/versions",
  authMiddleware,
  submittalUploads.array("files"),
  validate({
    params: z.object({ id: z.string() }),
    body: z.object({
      description: z.string().min(1),
    }),
  }),
  submittalController.handleCreateNewVersion.bind(submittalController)
);

// LIST SENT SUBMITTALS
router.get(
  "/sent",
  authMiddleware,
  submittalController.handleSent.bind(submittalController)
);

// LIST RECEIVED SUBMITTALS
router.get(
  "/received",
  authMiddleware,
  submittalController.handleReceived.bind(submittalController)
);

// LIST SUBMITTALS BY PROJECT
router.get(
  "/project/:projectId",
  authMiddleware,
  validate({ params: z.object({ projectId: z.string() }) }),
  submittalController.handleFindByProject.bind(submittalController)
);

// STREAM FILE (VERSION-AWARE)
router.get(
  "/:submittalId/versions/:versionId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      submittalId: z.string(),
      versionId: z.string(),
      fileId: z.string(),
    }),
  }),
  submittalController.handleViewFile.bind(submittalController)
);

// GET SUBMITTAL BY ID (WITH VERSIONS)
router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  submittalController.handleGetSubmittalById.bind(submittalController)
);

router.get("/pendingSubmittalResponse", authMiddleware, submittalController.handleGetPendingSubmittals.bind(submittalController))

// ===========================================================
// SUBMITTAL RESPONSES (VERSION-AWARE)
// ===========================================================

// CREATE RESPONSE (MUST TARGET A VERSION)
router.post(
  "/responses",
  authMiddleware,
  submittalResponseUploads.array("files"),
  validate({
    body: createSubmittalsResponseDto,
  }),
  submittalResponseController.handleCreateResponse.bind(
    submittalResponseController
  )
);

// UPDATE WORKFLOW STATUS (THREAD)
router.patch(
  "/responses/:parentResponseId/status",
  authMiddleware,
  validate({
    params: z.object({ parentResponseId: z.string() }),
    body: z.object({ status: z.string() }), // State enum validated in service
  }),
  submittalResponseController.handleUpdateStatus.bind(
    submittalResponseController
  )
);

// GET RESPONSE BY ID
router.get(
  "/responses/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  submittalResponseController.handleGetResponseById.bind(
    submittalResponseController
  )
);

// STREAM RESPONSE FILE
router.get(
  "/responses/:responseId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string(),
      fileId: z.string(),
    }),
  }),
  submittalResponseController.handleViewFile.bind(
    submittalResponseController
  )
);

export default router;
