import { Router } from "express";
import { RFIController } from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { RFISchema,UpdateRFISchema } from "./dtos";
import { rfiUploads, rfiResponseUploads } from "../../utils/multerUploader.util";
import z from "zod";

const router = Router();
const rfiController = new RFIController();
// const rfiResponseController = new RfiResponseController();

// ===========================================================
// RFI ROUTES
// ===========================================================

router.post(
  "/",
  authMiddleware,
  validate({ body: RFISchema }),
  rfiUploads.array("files"),
  rfiController.handleCreateRfi.bind(rfiController)
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
  "/:id",
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

router.delete(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  rfiController.handleCloseRfi.bind(rfiController)
);

// ===========================================================
// RFI RESPONSE ROUTES
// ===========================================================

// router.post(
//   "/:rfiId/responses",
//   authMiddleware,
//   validate({
//     params: z.object({ rfiId: z.string() }),
//     body: RfiResponseSchema,
//   }),
//   rfiResponseUploads.array("files"),
//   rfiResponseController.handleCreate.bind(rfiResponseController)
// );

// router.get(
//   "/responses/:id",
//   authMiddleware,
//   validate({ params: z.object({ id: z.string() }) }),
//   rfiResponseController.handleGetById.bind(rfiResponseController)
// );

// router.get(
//   "/responses/:rfiResId/files/:fileId",
//   authMiddleware,
//   validate({
//     params: z.object({
//       rfiResId: z.string(),
//       fileId: z.string(),
//     }),
//   }),
//   rfiResponseController.handleGetFile.bind(rfiResponseController)
// );

// router.get(
//   "/viewFile/:rfiResId/files/:fileId",
//   authMiddleware,
//   validate({
//     params: z.object({
//       rfiResId: z.string(),
//       fileId: z.string(),
//     }),
//   }),
//   rfiResponseController.handleViewFile.bind(rfiResponseController)
// );

// export default router;
