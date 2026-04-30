import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { scanUploadMiddleware } from "../../middleware/scanUpload.middleware";
import {
  coordinationDrawingResponseUploads,
  coordinationDrawingUploads,
} from "../../utils/multerUploader.util";
import { CoordinationDrawingController } from "./controllers";
import {
  CreateCoordinationDrawingResponseSchema,
  CreateCoordinationDrawingSchema,
  UpdateCoordinationDrawingResponseSchema,
  UpdateCoordinationDrawingSchema,
} from "./dtos";
import z from "zod";

const router = Router();
const controller = new CoordinationDrawingController();

router.post(
  "/",
  authMiddleware,
  coordinationDrawingUploads.array("files"),
  scanUploadMiddleware,
  validate({ body: CreateCoordinationDrawingSchema }),
  controller.create
);
router.get("/", authMiddleware, controller.getAll);
router.get(
  "/project/:projectId",
  authMiddleware,
  validate({ params: z.object({ projectId: z.string().uuid() }) }),
  controller.getByProjectId
);
router.get(
  "/:drawingId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      drawingId: z.string().uuid(),
      fileId: z.string(),
    }),
  }),
  controller.getFile
);
router.get(
  "/viewFile/:drawingId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      drawingId: z.string().uuid(),
      fileId: z.string(),
    }),
  }),
  controller.viewFile
);
router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  controller.get
);
router.patch(
  "/:id",
  authMiddleware,
  coordinationDrawingUploads.array("files"),
  scanUploadMiddleware,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateCoordinationDrawingSchema,
  }),
  controller.update
);
router.delete(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  controller.delete
);

router.post(
  "/response",
  authMiddleware,
  coordinationDrawingResponseUploads.array("files"),
  scanUploadMiddleware,
  validate({ body: CreateCoordinationDrawingResponseSchema }),
  controller.createResponse
);
router.get(
  "/response/:responseId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string().uuid(),
      fileId: z.string(),
    }),
  }),
  controller.getResponseFile
);
router.get(
  "/response/viewFile/:responseId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      responseId: z.string().uuid(),
      fileId: z.string(),
    }),
  }),
  controller.viewResponseFile
);
router.get(
  "/response/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  controller.getResponse
);
router.patch(
  "/response/:id",
  authMiddleware,
  coordinationDrawingResponseUploads.array("files"),
  scanUploadMiddleware,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateCoordinationDrawingResponseSchema,
  }),
  controller.updateResponse
);
router.delete(
  "/response/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  controller.deleteResponse
);
router.get(
  "/drawing/:drawingId/responses",
  authMiddleware,
  validate({ params: z.object({ drawingId: z.string().uuid() }) }),
  controller.getResponsesByDrawingId
);

export default router;
