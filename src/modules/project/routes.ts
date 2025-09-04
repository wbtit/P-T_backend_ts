import Router from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { JobStudyController } from "./jobStudy";
import { 
    JobStudyRequestSchema,
    JobStudySchema
 } from "./jobStudy/dtos";
 import z from "zod";
 import { asyncHandler } from "../../config/utils/asyncHandler";


 import { ProjectController } from "./controllers";
 import { CreateProjectSchema, UpdateProjectSchema } from "./dtos";
 import { projectUploads } from "../../utils/multerUploader.util";


 import { PLIController } from "./projectLineItems";
 import { ProjectLineItemSchema,
    UpdateProjectLineItemSchema } from "./projectLineItems";

import { WBSController } from "./WBS";
import { WBSSchema } from "./WBS";

import { NoteSchema,NoteUpdateSchema } from "./notes";
import { NotesController } from "./notes";


const router = Router();


// ===========================================================
// JOBSTUDY ROUTES
// ===========================================================
const jobStudyController = new JobStudyController();
router.post("/job-studies", authMiddleware, validate({body: JobStudyRequestSchema}), asyncHandler(jobStudyController.create.bind(jobStudyController)));
router.put("/job-studies/:id", authMiddleware, validate({body: JobStudySchema}), asyncHandler(jobStudyController.update.bind(jobStudyController)));
router.get("/job-studies/:id", authMiddleware, validate({params:z.object({id:z.string()})}), asyncHandler(jobStudyController.findByProjectId.bind(jobStudyController)));
// ===========================================================
// PROJECTS ROUTES
// ===========================================================
const projectController = new ProjectController();
router.post("/projects", authMiddleware, validate({body: CreateProjectSchema}),projectUploads.array("files"), asyncHandler(projectController.handleCreateProject.bind(projectController)));
router.put("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()}),body: UpdateProjectSchema}),projectUploads.array("files"), asyncHandler(projectController.handleUpdateProject.bind(projectController)));
router.get("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), asyncHandler(projectController.handleGetProject.bind(projectController)));
router.delete("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), asyncHandler(projectController.handleDeleteProject.bind(projectController)));
router.get("/projects", authMiddleware, asyncHandler(projectController.handleGetAllProjects.bind(projectController)));
router.get("/projects/:projectId/files/:fileId", authMiddleware,validate({params:z.object({projectId:z.string(),fileId:z.string()})}), asyncHandler(projectController.handleGetFile.bind(projectController)));
router.get("/viewFile/:projectId/:fileId", authMiddleware,validate({params:z.object({projectId:z.string(),fileId:z.string()})}), asyncHandler(projectController.handleViewFile.bind(projectController)));
router.get("/projects/:projectId/update-history", authMiddleware,validate({params:z.object({projectId:z.string()})}), asyncHandler(projectController.handleGetProjectUpdateHistory.bind(projectController)));
// ===========================================================
// PLI ROUTES
// ===========================================================
const pliController = new PLIController();
router.post(
    "/projects/:projectId/work-break-downs/:workBreakDownId/line-items",
    authMiddleware,
    validate({body: ProjectLineItemSchema}),
    asyncHandler(pliController.createPli.bind(pliController))
);
router.put(
    "/projects/:projectId/work-break-downs/:workBreakDownId/line-items/:id",
    authMiddleware,
    validate({body: UpdateProjectLineItemSchema}),
    asyncHandler(pliController.updatePli.bind(pliController))
);
router.get(
    "/projects/:projectId/work-break-downs/:workBreakDownId/line-items/:id",
    authMiddleware,
    asyncHandler(pliController.getPliByStage.bind(pliController))
);
// ===========================================================
// PLI ROUTES
// ===========================================================
const wbsController = new WBSController();

// WBS under a project
router.post(
  "/projects/:projectId/wbs",
  authMiddleware,
  validate({ body: WBSSchema }),
  asyncHandler(wbsController.create.bind(wbsController))
);

router.get(
  "/projects/:projectId/wbs",
  authMiddleware,
  asyncHandler(wbsController.getAll.bind(wbsController))
);

// Single WBS
router.get(
  "/projects/:projectId/wbs/:wbsId",
  authMiddleware,
  asyncHandler(wbsController.getWbsForProject.bind(wbsController))
);

// WBS stats & totals
router.get(
  "/projects/:projectId/wbs/:wbsId/total-hours",
  authMiddleware,
  asyncHandler(wbsController.getTotalWbsHours.bind(wbsController))
);

router.get(
  "/projects/:projectId/wbs/:wbsId/total",
  authMiddleware,
  asyncHandler(wbsController.getWbsTotal.bind(wbsController))
);

router.get(
  "/projects/:projectId/wbs/:wbsId/stats",
  authMiddleware,
  asyncHandler(wbsController.getWbsStats.bind(wbsController))
);
// ===========================================================
// NOTES ROUTES
// ===========================================================
const notesController = new NotesController();

router.post("/projects/:projectId/notes", authMiddleware, validate({ body: NoteSchema }), asyncHandler(notesController.create.bind(notesController)));
router.put("/projects/:projectId/notes/:id", authMiddleware, validate({ body: NoteUpdateSchema }), asyncHandler(notesController.update.bind(notesController)));
router.get("/projects/:projectId/notes/:id", authMiddleware, asyncHandler(notesController.findById.bind(notesController)));
router.delete("/projects/:projectId/notes/:id", authMiddleware, asyncHandler(notesController.delete.bind(notesController)));
router.get("/projects/:projectId/notes", authMiddleware, asyncHandler(notesController.findAll.bind(notesController)));

export default router;