import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import {createWhSchema,updateWhSchema} from "./dtos";
import authMiddleware from "../../middleware/authMiddleware";
import { EstWHController,WHController } from "./controller";
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
    validate({params:z.object({id:z.string()})}),
    asyncHandler(whController.handleStartTask.bind(whController))
);
router.patch('/pause/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(whController.handlePauseTask.bind(whController))
);
router.post('/resume/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(whController.handleResumeTask.bind(whController))
);
router.post('/end/:id',
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateWhSchema}),
    asyncHandler(whController.handleEndTask.bind(whController))
);
router.post("/reworkStart/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
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
// ------------------------------------------
// START TASK
// ------------------------------------------
router.post(
  "/EST/start/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() })  // estimationTaskId
  }),
  asyncHandler(EstController.handleStartTask.bind(EstController))
);

// ------------------------------------------
// PAUSE TASK (requires whId in body)
// ------------------------------------------
router.patch(
  "/EST/pause/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: z.object({
      whId: z.string()
    })
  }),
  asyncHandler(EstController.handlePauseTask.bind(EstController))
);

// ------------------------------------------
// RESUME TASK (NO BODY)
// ------------------------------------------
router.post(
  "/EST/resume/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() })
  }),
  asyncHandler(EstController.handleResumeTask.bind(EstController))
);

// ------------------------------------------
// END TASK (requires whId)
// ------------------------------------------
router.post(
  "/EST/end/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: z.object({
      whId: z.string()
    })
  }),
  asyncHandler(EstController.handleEndTask.bind(EstController))
);

// ------------------------------------------
// START REWORK (NO BODY)
// ------------------------------------------
router.post(
  "/EST/reworkStart/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() })
  }),
  asyncHandler(EstController.handleReworkStartTask.bind(EstController))
);

// ------------------------------------------
// END REWORK (requires whId)
// ------------------------------------------
router.post(
  "/EST/reworkEnd/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
    body: z.object({
      whId: z.string()
    })
  }),
  asyncHandler(EstController.handleReworkEndTask.bind(EstController))
);

// ------------------------------------------
// GET TASK SUMMARY
// ------------------------------------------
router.get(
  "/EST/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() })
  }),
  asyncHandler(EstController.handleGetTaskSummary.bind(EstController))
);

export default router;
        