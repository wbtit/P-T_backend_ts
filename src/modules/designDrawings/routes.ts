import { Router } from "express";
import { DesignDrawingsController } from "./controller";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import {
  CreateDesignDrawingsSchema,
  UpdateDesignDrawingsSchema,
  CreateDesignDrawingsResponsesSchema,
} from "./dtos";
import { designUploads, designResponseUploads } from "../../utils/multerUploader.util";
import z from "zod";

const router = Router();
const designController = new DesignDrawingsController();

// ===========================================================
// DESIGN DRAWINGS ROUTES
// ===========================================================

// ✅ Create new Design Drawing
router.post(
  "/",
  authMiddleware,
  designUploads.array("files"),
  validate({ body: CreateDesignDrawingsSchema }),
  designController.handleCreateDesignDrawing.bind(designController)
);

// ✅ Update stage / description of a Design Drawing
router.put(
  "/:id",
  authMiddleware,
  designUploads.array("files"),
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateDesignDrawingsSchema,
  }),
  designController.handleUpdateStage.bind(designController)
);

// ✅ Get all Design Drawings (Admin)
router.get(
  "/",
  authMiddleware,
  designController.handleGetAll.bind(designController)
);

// ✅ Get Design Drawings by Project ID
router.get(
  "/project/:projectId",
  authMiddleware,
  validate({
    params: z.object({ projectId: z.string() }),
  }),
  designController.handleGetByProject.bind(designController)
);

// ✅ Get a single Design Drawing by ID
router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  designController.handleGetById.bind(designController)
);

// ✅ Delete a Design Drawing
router.delete(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  designController.handleDelete.bind(designController)
);

// ✅ Get file metadata (from Design Drawing)
router.get(
  "/:designId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      designId: z.string(),
      fileId: z.string(),
    }),
  }),
  designController.handleGetFile.bind(designController)
);

// ✅ Stream file (from Design Drawing)
router.get(
  "/viewFile/:designId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      designId: z.string(),
      fileId: z.string(),
    }),
  }),
  designController.handleViewFile.bind(designController)
);

// ===========================================================
// DESIGN DRAWINGS RESPONSE ROUTES
// ===========================================================

// ✅ Create Response for a Design Drawing
router.post(
  "/:designId/responses",
  authMiddleware,
  designResponseUploads.array("files"),
  validate({
    params: z.object({ designId: z.string() }),
    body: CreateDesignDrawingsResponsesSchema,
  }),
  designController.handleCreateResponse.bind(designController)
);

// ✅ Get all responses for a Design Drawing
router.get(
  "/:designId/responses",
  authMiddleware,
  validate({
    params: z.object({ designId: z.string() }),
  }),
  designController.handleGetResponses.bind(designController)
);

// ✅ Get file metadata (from Response)
router.get(
  "/responses/:responseId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string(),
      fileId: z.string(),
    }),
  }),
  designController.handleGetResponseFile.bind(designController)
);

// ✅ Stream file (from Response)
router.get(
  "/viewFile/response/:responseId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string(),
      fileId: z.string(),
    }),
  }),
  designController.handleViewResponseFile.bind(designController)
);

export default router;
