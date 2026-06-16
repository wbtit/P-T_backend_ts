import { Router } from "express";
import { ConnectionDesignerQuotaResponseController } from "./controllers";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import z from "zod";
import { connectionDesignerQuotaResponseUploads } from "../../utils/multerUploader.util";

import {
  CreateConnectionDesignerQuotaResponseSchema,
  UpdateConnectionDesignerQuotaResponseSchema,
} from "./dtos";

const router = Router();
const responseCtrl = new ConnectionDesignerQuotaResponseController();

router.post(
  "/",
  authMiddleware,
  connectionDesignerQuotaResponseUploads.array("files", 50),
  validate({ body: CreateConnectionDesignerQuotaResponseSchema }),
  asyncHandler(responseCtrl.handleCreateResponse.bind(responseCtrl))
);

router.get(
  "/all",
  authMiddleware,
  asyncHandler(responseCtrl.handleGetAllResponses.bind(responseCtrl))
);

router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(responseCtrl.handleGetResponseById.bind(responseCtrl))
);

router.get(
  "/quota/:quotaId",
  authMiddleware,
  validate({ params: z.object({ quotaId: z.string().uuid() }) }),
  asyncHandler(responseCtrl.handleGetResponsesByQuotaId.bind(responseCtrl))
);

router.put(
  "/:id",
  authMiddleware,
  connectionDesignerQuotaResponseUploads.array("files", 50),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateConnectionDesignerQuotaResponseSchema,
  }),
  asyncHandler(responseCtrl.handleUpdateResponse.bind(responseCtrl))
);

router.delete(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(responseCtrl.handleDeleteResponse.bind(responseCtrl))
);

export default router;
