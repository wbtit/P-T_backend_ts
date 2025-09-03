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
router.post("/projects", authMiddleware, validate({body: CreateProjectSchema}), projectController.handleCreateProject.bind(projectController));
router.put("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()}),body: UpdateProjectSchema}), projectController.handleUpdateProject.bind(projectController));
router.get("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), projectController.handleGetProject.bind(projectController));
router.delete("/projects/:id", authMiddleware, validate({params:z.object({id:z.string()})}), projectController.handleDeleteProject.bind(projectController));
router.get("/projects", authMiddleware, projectController.handleGetAllProjects.bind(projectController));
router.get("/projects/:projectId/files/:fileId", authMiddleware, projectController.handleGetFile.bind(projectController));

export default router;