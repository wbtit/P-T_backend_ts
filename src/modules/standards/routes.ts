import { Router } from "express";
import { StandardsController } from "./controllers/standards.controller";
import { roleGuard } from "../../middleware/roleGuard";
import authMiddleware from "../../middleware/authMiddleware";

import { standardsUploads, standardsDataMap } from "../../utils/multerUploader.util";

export const standardsRoutes = Router();
export const projectStandardsRoutes = Router({ mergeParams: true });
const controller = new StandardsController();

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

// Phase 6: the real endpoints. `/upload`, the old `/image`, and
// `/documents/:id/progress` (a strict subset of `/documents/:id` below, no
// independent behavior) were all removed once these were verified end to end.
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

// Phase 6: the real /image endpoint -- swapped in now, not held for a later
// deprecation step, since a broken image link makes QUERY's response
// untestable. Same URL shape the old getStandardImage used (and the same
// shape chatService.ts's citation imagePaths already emit), new correct
// implementation. Confirmed unused elsewhere before removal (grep, no other
// server-side caller of getStandardImage).
standardsRoutes.get(
  "/image/:documentId/:pageNumber",
  controller.getPageImage.bind(controller)
);

// Phase 6 QUERY -- the real, product-shaped endpoint (aiSummary/
// deferralReason/results). The old `/chat` route (same real askStandards()
// pipeline, but unwrapped to the old single-answer shape -- exactly the
// pre-pivot behavior this rebuild replaced) was removed once QUERY was
// verified end to end. `/chat/history` stays -- real, persisted, independent
// feature -- but its response shape was updated to match QUERY's, since
// askStandards() (called only from QUERY now) is the sole write path.
projectStandardsRoutes.post(
  "/query",
  authMiddleware,
  controller.query.bind(controller)
);

projectStandardsRoutes.get(
  "/chat/history",
  authMiddleware,
  // roleGuard(["STAFF", "DETAILER"]),
  controller.getChatHistory.bind(controller)
);
