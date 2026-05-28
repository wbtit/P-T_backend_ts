import { Router } from "express";
import { BfaController } from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { scanUploadMiddleware } from "../../middleware/scanUpload.middleware";
import { createBfaDto, updateBfaDto } from "./dtos";
import { bfaUploads } from "../../utils/multerUploader.util";
import z from "zod";

const router = Router();
const bfaController = new BfaController();

// Create a new BFA with files (initial version v1)
router.post(
  "/",
  authMiddleware,
  bfaUploads.array("files"),
  scanUploadMiddleware,
  validate({ body: createBfaDto }),
  bfaController.handleCreateBfa.bind(bfaController)
);

// Get list of all BFAs
router.get(
  "/",
  authMiddleware,
  bfaController.handleListBfas.bind(bfaController)
);

// Get a single BFA by ID
router.get(
  "/:id",
  authMiddleware,
  validate({
    params: z.object({
      id: z.string().uuid("Invalid BFA ID"),
    }),
  }),
  bfaController.handleGetBfaById.bind(bfaController)
);

// Get BFA by submittal ID
router.get(
  "/submittal/:submittalId",
  authMiddleware,
  validate({
    params: z.object({
      submittalId: z.string().uuid("Invalid submittal ID"),
    }),
  }),
  bfaController.handleGetBfaBySubmittalId.bind(bfaController)
);

// Update a BFA (increments version and creates new version history)
router.put(
  "/:id",
  authMiddleware,
  bfaUploads.array("files"),
  scanUploadMiddleware,
  validate({
    params: z.object({
      id: z.string().uuid("Invalid BFA ID"),
    }),
    body: updateBfaDto,
  }),
  bfaController.handleUpdateBfa.bind(bfaController)
);

// Delete a BFA by ID
router.delete(
  "/:id",
  authMiddleware,
  validate({
    params: z.object({
      id: z.string().uuid("Invalid BFA ID"),
    }),
  }),
  bfaController.handleDeleteBfa.bind(bfaController)
);

// Stream file from the current version of the BFA
router.get(
  "/viewFile/:bfaId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      bfaId: z.string().uuid("Invalid BFA ID"),
      fileId: z.string().min(1, "File ID is required"),
    }),
  }),
  bfaController.handleViewFile.bind(bfaController)
);

export default router;
