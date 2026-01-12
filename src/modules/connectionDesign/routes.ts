import { Router } from "express";
import { ConnectionDesignerController } from "./controllers";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";

import z from "zod";
import { connectionDesignerCertificatesUploads, connectionDesignerUploads, connectionDesignerCombinedUploads } from "../../utils/multerUploader.util";

import {
  ConnectionDesignerSchema,
  updateConnectionDesignerSchema,
} from "./dtos";

const router = Router();
const cdCtrl = new ConnectionDesignerController();

/**
 * ---------------------------------------------------------------------
 *  CREATE Connection Designer
 * ---------------------------------------------------------------------
 */
router.post(
  "/",
  authMiddleware,
  connectionDesignerCombinedUploads,
  validate({ body: ConnectionDesignerSchema }),
  asyncHandler(cdCtrl.handleCreateConnectionDesigner.bind(cdCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  UPDATE Connection Designer
 * ---------------------------------------------------------------------
 */
router.put(
  "/update/:id",
  authMiddleware,
  connectionDesignerCombinedUploads,
  validate({
    params: z.object({ id: z.string() }),
    body: updateConnectionDesignerSchema,
  }),
  asyncHandler(cdCtrl.handleUpdateConnectionDesigner.bind(cdCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET ALL Connection Designers
 * ---------------------------------------------------------------------
 */
router.get(
  "/all",
  authMiddleware,
  asyncHandler(cdCtrl.handleGetAllConnectionDesigners.bind(cdCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET Connection Designer by ID
 * ---------------------------------------------------------------------
 */
router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(cdCtrl.handleGetConnectionDesignerById.bind(cdCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET FILE (Meta)
 * ---------------------------------------------------------------------
 */
router.get(
  "/file/:designerId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      designerId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(cdCtrl.handleGetFile.bind(cdCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  VIEW / STREAM FILE
 * ---------------------------------------------------------------------
 */
router.get(
  "/viewFile/:designerId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      designerId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(cdCtrl.handleViewFile.bind(cdCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  DELETE FILE FROM DESIGNER
 * ---------------------------------------------------------------------
 */
router.delete(
  "/files/:designerId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      designerId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(cdCtrl.handleDeleteFile.bind(cdCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  DELETE Connection Designer
 * ---------------------------------------------------------------------
 */
router.delete(
  "/id/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  asyncHandler(cdCtrl.handleDeleteConnectionDesigner.bind(cdCtrl))
);

export default router;
