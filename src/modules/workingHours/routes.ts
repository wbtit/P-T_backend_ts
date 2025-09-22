import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import {createWhSchema,updateWhSchema} from "./dtos";
import authMiddleware from "../../middleware/authMiddleware";
import { WHController } from "../workingHours/controller/wh.controller";
import { EstWHController } from "./controller";
import { Router } from "express";
import z from "zod";

const router = Router();
const whController = new WHController();
const EstController= new EstWHController()
// ====================================================
// tASK WORKING HOURS 
// ====================================================
router.post('/start/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:createWhSchema}),
    asyncHandler(whController.handleStartTask.bind(whController))
);
router.patch('/pause/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(whController.handlePauseTask.bind(whController))
);
router.post('/resume/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:createWhSchema}),
    asyncHandler(whController.handleResumeTask.bind(whController))
);
router.post('/end/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(whController.handleEndTask.bind(whController))
);
router.post("/reworkStart/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:createWhSchema}),
    asyncHandler(whController.handleReworkStartTask.bind(whController))
);
router.post("/reworkEnd/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(whController.handleReworkEndTask.bind(whController))
);
router.get('/',
    authMiddleware,
    asyncHandler(whController.handleGetTaskSummary.bind(whController))
);
// ==============================================================
// ESTIMATION TASK WORKING HOURS
// ==============================================================
router.post('EST/start/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:createWhSchema}),
    asyncHandler(EstController.handleStartTask.bind(EstController))
);
router.patch('EST/pause/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(EstController.handlePauseTask.bind(EstController))
);
router.post('EST/resume/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:createWhSchema}),
    asyncHandler(EstController.handleResumeTask.bind(EstController))
);
router.post('EST/end/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(EstController.handleEndTask.bind(EstController))
);
router.post("EST/reworkStart/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:createWhSchema}),
    asyncHandler(EstController.handleReworkStartTask.bind(EstController))
);
router.post("EST/reworkEnd/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(EstController.handleReworkEndTask.bind(EstController))
);
router.get('EST/',
    authMiddleware,
    asyncHandler(EstController.handleGetTaskSummary.bind(EstController))
);
export default router;
        