import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { scanUploadMiddleware } from "../../middleware/scanUpload.middleware";
import {
  projectProgressReportResponseUploads,
  projectProgressReportUploads,
} from "../../utils/multerUploader.util";
import { ProjectProgressReportController } from "./controllers";
import {
  CreateProjectProgressReportResponseSchema,
  CreateProjectProgressReportSchema,
  UpdateProjectProgressReportResponseSchema,
  UpdateProjectProgressReportSchema,
} from "./dtos";
import z from "zod";

const router = Router();
const controller = new ProjectProgressReportController();

router.post(
  "/",
  authMiddleware,
  projectProgressReportUploads.array("files"),
  scanUploadMiddleware,
  validate({ body: CreateProjectProgressReportSchema }),
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
  "/:reportId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      reportId: z.string().uuid(),
      fileId: z.string(),
    }),
  }),
  controller.getFile
);
router.get(
  "/viewFile/:reportId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      reportId: z.string().uuid(),
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
  projectProgressReportUploads.array("files"),
  scanUploadMiddleware,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateProjectProgressReportSchema,
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
  projectProgressReportResponseUploads.array("files"),
  scanUploadMiddleware,
  validate({ body: CreateProjectProgressReportResponseSchema }),
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
  projectProgressReportResponseUploads.array("files"),
  scanUploadMiddleware,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateProjectProgressReportResponseSchema,
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
  "/report/:reportId/responses",
  authMiddleware,
  validate({ params: z.object({ reportId: z.string().uuid() }) }),
  controller.getResponsesByReportId
);

export default router;
