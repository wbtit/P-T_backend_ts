import Router from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { JobStudyController } from "./jobStudy";
import { 
    JobStudyRequestSchema,
    JobStudySchema
 } from "./jobStudy/dtos";
 import z from "zod";


 import { ProjectController } from "./controllers";
 import { CreateProjectSchema, UpdateProjectSchema } from "./dtos";
 import { projectUploads } from "../../utils/multerUploader.util";


 import { PLIController } from "./projectLineItems";
 import { ProjectLineItemSchema,
    UpdateProjectLineItemSchema } from "./projectLineItems";

import { WBSController } from "./WBS";
import { WBSSchema,UpdateWBSSchema } from "./WBS";


const router = Router();


// ===========================================================
// JOBSTUDY ROUTES
// ===========================================================
const jobStudyController = new JobStudyController();
router.post("/job-studies", authMiddleware, validate({body: JobStudyRequestSchema}), jobStudyController.create.bind(jobStudyController));
router.put("/job-studies/:id", authMiddleware, validate({body: JobStudySchema}), jobStudyController.update.bind(jobStudyController));
router.get("/job-studies/:id", authMiddleware, validate({params:z.object({id:z.string()})}), jobStudyController.findByProjectId.bind(jobStudyController));
// ===========================================================
// PROJECTS ROUTES
// ===========================================================
const projectController = new ProjectController();
router.post("/projects", authMiddleware, validate({body: CreateProjectSchema}),projectUploads.array("files"), projectController.handleCreateProject.bind(projectController));
router.put("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()}),body: UpdateProjectSchema}),projectUploads.array("files"), projectController.handleUpdateProject.bind(projectController));
router.get("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), projectController.handleGetProject.bind(projectController));
router.delete("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), projectController.handleDeleteProject.bind(projectController));
router.get("/projects", authMiddleware, projectController.handleGetAllProjects.bind(projectController));
router.get("/projects/:projectId/files/:fileId", authMiddleware,validate({params:z.object({projectId:z.string(),fileId:z.string()})}), projectController.handleGetFile.bind(projectController));
router.get("/viewFile/:projectId/:fileId", authMiddleware,validate({params:z.object({projectId:z.string(),fileId:z.string()})}), projectController.handleViewFile.bind(projectController));
// ===========================================================
// PLI ROUTES
// ===========================================================
const pliController = new PLIController();
router.post(
    "/projects/:projectId/work-break-downs/:workBreakDownId/line-items",
    authMiddleware,
    validate({body: ProjectLineItemSchema}),
    pliController.createPli.bind(pliController)
);
router.put(
    "/projects/:projectId/work-break-downs/:workBreakDownId/line-items/:id",
    authMiddleware,
    validate({body: UpdateProjectLineItemSchema}),
    pliController.updatePli.bind(pliController)
);
router.get(
    "/projects/:projectId/work-break-downs/:workBreakDownId/line-items/:id",
    authMiddleware,
    pliController.getPliByStage.bind(pliController)
);
// ===========================================================
// PLI ROUTES
// ===========================================================
const wbsController= new WBSController();
router.post("/projects/:projectId/work-break-downs/:workBreakDownId/wbs", authMiddleware, validate({body: WBSSchema}), wbsController.create.bind(wbsController));
router.get("/projects/:projectId/work-break-downs/wbs", authMiddleware, wbsController.getAll.bind(wbsController));
router.get("/projects/:projectId/work-break-downs/:workBreakDownId/wbs/:id", authMiddleware, wbsController.getWbsForProject.bind(wbsController));
router.get("/projects/:projectId/work-break-downs/:workBreakDownId/wbs/:id/total-hours", authMiddleware, wbsController.getTotalWbsHours.bind(wbsController));
router.get("/projects/:projectId/work-break-downs/:workBreakDownId/wbs/:id/total", authMiddleware, wbsController.getWbsTotal.bind(wbsController));
router.get("/projects/:projectId/work-break-downs/:workBreakDownId/wbs/:id/stats", authMiddleware, wbsController.getWbsStats.bind(wbsController));

export default router;