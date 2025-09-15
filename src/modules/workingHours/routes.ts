import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import { findWhSchema,
    createWhSchema,
    updateWhSchema, FindMany
} from "./dtos";
import authMiddleware from "../../middleware/authMiddleware";
import { WHController } from "../workingHours/controller/wh.controller";
import { Router } from "express";
import z from "zod";

const router = Router();
const whController = new WHController();

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

export default router;
        