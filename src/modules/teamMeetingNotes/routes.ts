import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import z from "zod";
import { teamMeetingNotesUploads, teamMeetingNotesResponsesUploads } from "../../utils/multerUploader.util";
import { TeamMeetingNotesController } from "./controllers/teamMeetingNotes.controller";
import { TeamMeetingNoteSchema, TeamMeetingNoteUpdateSchema } from "./dtos";
import { TeamMeetingNoteResponseController } from "./responses/controllers/teamMeetingNoteResponse.controller";
import { TeamMeetingNoteResponseSchema } from "./responses/dtos";

const router = Router();
const controller = new TeamMeetingNotesController();
const responseController = new TeamMeetingNoteResponseController();

router.post(
  "/",
  authMiddleware,
  teamMeetingNotesUploads.array("files"),
  validate({ body: TeamMeetingNoteSchema }),
  asyncHandler(controller.create.bind(controller))
);

router.put(
  "/:id",
  authMiddleware,
  teamMeetingNotesUploads.array("files"),
  validate({ params: z.object({ id: z.string() }), body: TeamMeetingNoteUpdateSchema }),
  asyncHandler(controller.update.bind(controller))
);

router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(controller.findById.bind(controller))
);

router.delete(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(controller.delete.bind(controller))
);

router.get(
  "/project/:projectId",
  authMiddleware,
  validate({ params: z.object({ projectId: z.string() }) }),
  asyncHandler(controller.findByProjectId.bind(controller))
);

router.get(
  "/meeting/:meetingId",
  authMiddleware,
  validate({ params: z.object({ meetingId: z.string() }) }),
  asyncHandler(controller.findByMeetingId.bind(controller))
);

router.get(
  "/",
  authMiddleware,
  asyncHandler(controller.findAll.bind(controller))
);

router.get(
  "/file/:noteId/:fileId",
  authMiddleware,
  validate({ params: z.object({ noteId: z.string(), fileId: z.string() }) }),
  asyncHandler(controller.getFile.bind(controller))
);

router.get(
  "/viewFile/:noteId/:fileId",
  authMiddleware,
  validate({ params: z.object({ noteId: z.string(), fileId: z.string() }) }),
  asyncHandler(controller.viewFile.bind(controller))
);
//Responses routes
router.post(
  "/:noteId/responses",
  authMiddleware,
  teamMeetingNotesResponsesUploads.array("files"),
  validate({ params: z.object({ noteId: z.string() }), body: TeamMeetingNoteResponseSchema }),
  asyncHandler(responseController.handleCreate.bind(responseController))
);

router.get(
  "/:noteId/responses",
  authMiddleware,
  validate({ params: z.object({ noteId: z.string() }) }),
  asyncHandler(responseController.handleGetByNote.bind(responseController))
);

router.get(
  "/responses/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(responseController.handleGetById.bind(responseController))
);

router.put(
  "/responses/:id",
  authMiddleware,
  teamMeetingNotesResponsesUploads.array("files"),
  validate({ params: z.object({ id: z.string() }), body: TeamMeetingNoteResponseSchema.partial() }),
  asyncHandler(responseController.handleUpdate.bind(responseController))
);

router.delete(
  "/responses/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(responseController.handleDelete.bind(responseController))
);

router.get(
  "/responses/file/:responseId/:fileId",
  authMiddleware,
  validate({ params: z.object({ responseId: z.string(), fileId: z.string() }) }),
  asyncHandler(responseController.handleGetFile.bind(responseController))
);

router.get(
  "/responses/viewFile/:responseId/:fileId",
  authMiddleware,
  validate({ params: z.object({ responseId: z.string(), fileId: z.string() }) }),
  asyncHandler(responseController.handleViewFile.bind(responseController))
);

export default router;
