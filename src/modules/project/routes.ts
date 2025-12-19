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
 import { projectUploads,notesUploads } from "../../utils/multerUploader.util";


 import { PLIController } from "./projectLineItems";
 import { ProjectLineItemSchema,
    UpdateProjectLineItemSchema } from "./projectLineItems";

import { WBSController } from "./WBS";

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
router.post("/projects", authMiddleware,projectUploads.array("files"), validate({body: CreateProjectSchema}),
asyncHandler(projectController.handleCreateProject.bind(projectController)));

router.put("/projects/:id", authMiddleware,projectUploads.array("files"), validate({params:z.object({id:z.string()}),body: UpdateProjectSchema}), 
asyncHandler(projectController.handleUpdateProject.bind(projectController)));

router.get("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), 
asyncHandler(projectController.handleGetProject.bind(projectController)));

router.delete("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), 
asyncHandler(projectController.handleDeleteProject.bind(projectController)));

router.get("/projects", authMiddleware, asyncHandler(projectController.handleGetAllProjects.bind(projectController)));

router.get("/projects/:projectId/files/:fileId", authMiddleware,validate({params:z.object({projectId:z.string(),fileId:z.string()})}), 
asyncHandler(projectController.handleGetFile.bind(projectController)));

router.get("/viewFile/:projectId/:fileId", authMiddleware,validate({params:z.object({projectId:z.string(),fileId:z.string()})}), 
asyncHandler(projectController.handleViewFile.bind(projectController)));

router.get("/projects/:projectId/update-history", authMiddleware,validate({params:z.object({projectId:z.string()})}), 

asyncHandler(projectController.handleGetProjectUpdateHistory.bind(projectController)));

router.post("/projects/:projectId/wbs/expand",authMiddleware,asyncHandler(projectController.expandWbs.bind(projectController)));
// ===========================================================
// PLI ROUTES
// ===========================================================
const pliController = new PLIController();
router.patch(
    "/projects/:projectId/line-items/bulk",
    authMiddleware,
    validate({body: ProjectLineItemSchema}),
    asyncHandler(pliController.bulkUpdateLineItems.bind(pliController))
);
router.patch(
    "/projects/:projectId/line-items/:lineItemId",
    authMiddleware,
    validate({body: UpdateProjectLineItemSchema}),
    asyncHandler(pliController.updateLineItem.bind(pliController))
);
//get line items
router.get(
    "/projects/:projectId/stages/:stage/wbs/:projectWbsId/line-items",
    authMiddleware,
    asyncHandler(pliController.getLineItems.bind(pliController))
);
// ===========================================================
// WBS` ROUTES
// ===========================================================
const wbsController = new WBSController();

// WBS under a project
router.get(
  "/wbs-templates",
  authMiddleware,
  asyncHandler(wbsController.getWbsTemplates.bind(wbsController))
);

router.post(
  "/wbs-templates",
  authMiddleware,
  asyncHandler(wbsController.createWbsTemplate.bind(wbsController))
);

router.get(
  "/projects/:projectId/wbs/:wbsId/stats",
  authMiddleware,
  asyncHandler(wbsController.getWbsStats.bind(wbsController))
);

router.get(
  "/projects/:projectId/dashboard/stats/:stage",
  authMiddleware,
  asyncHandler(wbsController.getProjectDashboardStats.bind(wbsController))
);

router.get(
  "/projects/:projectId/dashboard/activity-stats/:stage",
  authMiddleware,
  asyncHandler(wbsController.getActivityDashboardStats.bind(wbsController))
);
// ===========================================================
// NOTES ROUTES
// ===========================================================
const notesController = new NotesController();

router.post("/projects/:projectId/notes", authMiddleware, notesUploads.array("files"), validate({ body: NoteSchema }), asyncHandler(notesController.create.bind(notesController)));
router.put("/projects/:projectId/notes/:id", authMiddleware, validate({ body: NoteUpdateSchema }), asyncHandler(notesController.update.bind(notesController)));
router.get("/projects/:projectId/notes/:id", authMiddleware, asyncHandler(notesController.findById.bind(notesController)));
router.delete("/projects/:projectId/notes/:id", authMiddleware, asyncHandler(notesController.delete.bind(notesController)));
router.get("/projects/:projectId/notes", authMiddleware, asyncHandler(notesController.findAll.bind(notesController)));

export default router;