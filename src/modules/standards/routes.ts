import { Router } from "express";
import { StandardsController } from "./controllers/standards.controller";
import { roleGuard } from "../../middleware/roleGuard";
import authMiddleware from "../../middleware/authMiddleware";

import { standardsUploads, standardsDataMap } from "../../utils/multerUploader.util";

export const standardsRoutes = Router();
export const projectStandardsRoutes = Router({ mergeParams: true });
const controller = new StandardsController();

standardsRoutes.get(
  "/image/:docunmentId/:pageNumber",
  controller.getStandardImage.bind(controller)
);

standardsRoutes.post(
  "/upload",
  authMiddleware,
  standardsUploads.single("file"),
  controller.uploadStandard.bind(controller)
);

standardsRoutes.get(
  "/families",
  authMiddleware,
  controller.getAvailableFamilies.bind(controller)
);

standardsRoutes.get(
  "/fabricators/:fabricatorId/families",
  authMiddleware,
  controller.getFabricatorFamilies.bind(controller)
);

standardsRoutes.get(
  "/documents/:id/progress",
  authMiddleware,
  controller.getDocumentProgress.bind(controller)
);

// Phase 6: the real endpoints. See standards.controller.ts's own comment
// block for why /upload and /image above are held, not reused, until these
// are verified.
standardsRoutes.post(
  "/documents",
  authMiddleware,
  standardsUploads.single("file"),
  controller.uploadDocument.bind(controller)
);

standardsRoutes.get(
  "/documents",
  authMiddleware,
  controller.listDocuments.bind(controller)
);

standardsRoutes.get(
  "/documents/:id",
  authMiddleware,
  controller.getDocumentStatus.bind(controller)
);

standardsRoutes.post(
  "/documents/:id/activate",
  authMiddleware,
  controller.activateDocument.bind(controller)
);

standardsRoutes.get(
  "/image-v2/:documentId/:pageNumber",
  controller.getPageImage.bind(controller)
);

projectStandardsRoutes.post(
  "/chat",
  authMiddleware,
  // roleGuard(["STAFF", "DETAILER"]),
  controller.chat.bind(controller)
);

projectStandardsRoutes.get(
  "/chat/history",
  authMiddleware,
  // roleGuard(["STAFF", "DETAILER"]),
  controller.getChatHistory.bind(controller)
);
