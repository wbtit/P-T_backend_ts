import Router from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { JobStudyController } from "./jobStudy";
import { 
    JobStudyRequestSchema,
    JobStudySchema
 } from "./jobStudy/dtos";
 import z from "zod";

const jobStudyController = new JobStudyController();

const router = Router();


// ===========================================================
// JOBSTUDY ROUTES
// ===========================================================

router.post("/job-studies", authMiddleware, validate({body: JobStudyRequestSchema}), jobStudyController.create.bind(jobStudyController));
router.put("/job-studies/:id", authMiddleware, validate({body: JobStudySchema}), jobStudyController.update.bind(jobStudyController));
router.get("/job-studies/:id", authMiddleware, validate({params:z.object({id:z.string()})}), jobStudyController.findByProjectId.bind(jobStudyController));

export default router;