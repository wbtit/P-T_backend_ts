import { Router } from "express";
import { RFIController } from "./controllers";
import { RFIResponseController } from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { RFISchema,UpdateRFISchema,RFIResponseSchema,UpdateRFIResponseDto} from "./dtos";
import { rfiUploads, rfiResponseUploads } from "../../utils/multerUploader.util";
import z from "zod";

const router = Router();
const rfiController = new RFIController();
const rfiResponseController = new RFIResponseController();

// ===========================================================
// RFI ROUTES
// ===========================================================

router.post(
  "/",
  authMiddleware,
  rfiUploads.array("files"),
  validate({ body: RFISchema }),
  rfiController.handleCreateRfi.bind(rfiController)
);
router.get(
  "/pendingRFIs",
  authMiddleware,
  rfiController.handlePendingRFIs.bind(rfiController)
)

router.get(
  "/viewFile/:rfiId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      rfiId: z.string(),
      fileId: z.string(),
    }),
  }),
  rfiController.handleViewFile.bind(rfiController)
);

router.put(
  "/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateRFISchema,
  }),
  rfiUploads.array("files"),
  rfiController.handleUpdateRfi.bind(rfiController)
);

router.get(
  "/getById/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  rfiController.handleGetRfiById.bind(rfiController)
);

router.get(
  "/sents",
  authMiddleware,
  rfiController.handleSent.bind(rfiController)
);

router.get(
  "/pending/clientAdmin",
  authMiddleware,
  rfiController.handlePendingForClientAdmin.bind(rfiController)
)
router.get(
  "/pending/projectManager",
  authMiddleware,
  rfiController.handlePendingForProjectManager.bind(rfiController)
)
router.get(
  "/new/projectManager",
  authMiddleware,
  rfiController.handleNewForProjectManager.bind(rfiController)
)

router.get(
  "/received",
  authMiddleware,
  rfiController.handleReceived.bind(rfiController)
);

router.get(
  "/:rfiId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      rfiId: z.string(),
      fileId: z.string(),
    }),
  }),
  rfiController.handleGetFile.bind(rfiController)
);

router.delete(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  rfiController.handleCloseRfi.bind(rfiController)
);


// ===========================================================
// RFI RESPONSE ROUTES
// ===========================================================

router.post(
  "/:rfiId/responses",
  authMiddleware,
  rfiResponseUploads.array("files"),
  validate({
    params: z.object({ rfiId: z.string() }),
    body: RFIResponseSchema,
  }),
  rfiResponseController.handleCreateResponse.bind(rfiResponseController)
);

router.get(
  "/responses/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  rfiResponseController.handleGetResponseById.bind(rfiResponseController)
);

router.get(
  "/responses/:rfiResId/files/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      rfiResId: z.string(),
      fileId: z.string(),
    }),
  }),
  rfiResponseController.handleGetFile.bind(rfiResponseController)
);

router.get(
  "/response/viewFile/:rfiResId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      rfiResId: z.string(),
      fileId: z.string(),
    }),
  }),
  rfiResponseController.handleViewFile.bind(rfiResponseController)
);

export default router;
