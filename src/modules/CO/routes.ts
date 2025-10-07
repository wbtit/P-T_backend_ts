import { Router } from "express";
import { COController } from "./controllers/co.controller";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import {
  CreateCoSchema,
  UpdateCoSchema,
  CreateCOTableSchema,
  CreateTableSchema,
  CoResponseSchema,
} from "./dtos";
import z from "zod";
import { coResponseUploads, coUploads } from "../../utils/multerUploader.util"; // similar to rfqUploads
import { CoResponseController } from "./controllers/coResponse.controller";

const router = Router();
const coController = new COController();

// ===========================================================
// CHANGE ORDER ROUTES
// ===========================================================

// Create new Change Order
router.post(
  "/",
  authMiddleware,
  validate({ body: CreateCoSchema }),
  coUploads.array("files"),
  coController.handleCreateCo.bind(coController)
);

// Update existing Change Order
router.put(
  "/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateCoSchema,
  }),
  coUploads.array("files"),
  coController.handleUpdateCo.bind(coController)
);

// Get CO by project ID
router.get(
  "/project/:projectId",
  authMiddleware,
  validate({ params: z.object({ projectId: z.string() }) }),
  coController.handleGetByProjectId.bind(coController)
);

// Sent COs
router.get(
  "/sent",
  authMiddleware,
  coController.handleSentCos.bind(coController)
);

// Received COs
router.get(
  "/received",
  authMiddleware,
  coController.handleReceivedCos.bind(coController)
);

// ===========================================================
// CO TABLE ROUTES
// ===========================================================

// Create multiple CO table rows
router.post(
  "/:coId/table",
  authMiddleware,
  validate({
    params: z.object({ coId: z.string() }),
    body: CreateCOTableSchema,
  }),
  coController.handleCreateCoTable.bind(coController)
);

// Update single CO table row
router.put(
  "/table/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: CreateTableSchema,
  }),
  coController.handleUpdateCoTableRow.bind(coController)
);

// Get all table rows for a CO
router.get(
  "/:coId/table",
  authMiddleware,
  validate({ params: z.object({ coId: z.string() }) }),
  coController.handleGetCoTableByCoId.bind(coController)
);

// ===========================================================
// FILE ROUTES
// ===========================================================

// Get file metadata (like name, type, etc.)
router.get(
  "/:coId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({ coId: z.string(), fileId: z.string() }),
  }),
  coController.handleGetFile.bind(coController)
);

// View file (stream)
router.get(
  "/viewFile/:coId/:fileId",
  authMiddleware,
  validate({
    params: z.object({ coId: z.string(), fileId: z.string() }),
  }),
  coController.handleViewFile.bind(coController)
);
const coResponseController = new CoResponseController();

// ===========================================================
// CO RESPONSE ROUTES
// ===========================================================

// CREATE CO RESPONSE
router.post(
  "/:coId/responses",
  authMiddleware,
  validate({
    params: z.object({ coId: z.string() }),
    body: CoResponseSchema,
  }),
  coResponseUploads.array("files"),
  coResponseController.handleCreateCoResponse.bind(coResponseController)
);

// GET CO RESPONSE BY ID
router.get(
  "/responses/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  coResponseController.handleGetResponseById.bind(coResponseController)
);

// GET ALL RESPONSES BY CO ID
router.get(
  "/:coId/responses",
  authMiddleware,
  validate({ params: z.object({ coId: z.string() }) }),
  coResponseController.handleGetResponsesByCoId.bind(coResponseController)
);

// GET a specific file metadata from CO response
router.get(
  "/responses/:responseId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string(),
      fileId: z.string(),
    }),
  }),
  coResponseController.handleGetFile.bind(coResponseController)
);

// STREAM file from CO response
router.get(
  "/viewFile/:responseId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string(),
      fileId: z.string(),
    }),
  }),
  coResponseController.handleViewFile.bind(coResponseController)
);

export default router;
