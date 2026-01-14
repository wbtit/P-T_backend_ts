import { asyncHandler } from "../../config/utils/asyncHandler";
import validate from "../../middleware/validate";
import {createWhSchema,updateWhSchema} from "./dtos";
import authMiddleware, { AuthenticateRequest } from "../../middleware/authMiddleware";
import { EstWHController,WHController } from "./controller";
import { Router, Response } from "express";
import z from "zod";
import { AppError } from "../../config/utils/AppError";
import { secondsBetween } from "../workingHours/utils/calculateSecs";

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
    validate({
    params: z.object({ id: z.string() }),
    body: z.object({
      whId: z.string()
    })
  }),
    asyncHandler(whController.handlePauseTask.bind(whController))
);
router.post('/resume/:id',
    authMiddleware,
     validate({
    params: z.object({ id: z.string() })
  }),
    asyncHandler(whController.handleResumeTask.bind(whController))
);
router.post('/end/:id',
    authMiddleware,
    validate({
    params: z.object({ id: z.string() }),
    body: z.object({
      whId: z.string()
    })
  }),
    asyncHandler(whController.handleEndTask.bind(whController))
);
router.post("/reworkStart/:id",
    authMiddleware,
    validate({
    params: z.object({ id: z.string() }),
    body: z.object({
      whId: z.string()
    })
  }),
    asyncHandler(whController.handleReworkStartTask.bind(whController))
);
router.post("/reworkEnd/:id",
    authMiddleware,
    validate({
    params: z.object({ id: z.string() })
  }),
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

// ------------------------------------------
// AUTO CLOSE ACTION (for task warnings)
// ------------------------------------------
router.post(
  "/auto-close-action/:taskId",
  authMiddleware,
  validate({
    params: z.object({ taskId: z.string() }),
    body: z.object({
      action: z.enum(["end_task", "request_more_hours"])
    })
  }),
  asyncHandler(async (req: AuthenticateRequest, res: Response) => {
    const { taskId } = req.params;
    const { action } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const prisma = (await import("../../config/database/client")).default;

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        user_id: userId,
        autoCloseWarningSent: true,
        autoCloseActionTaken: false
      }
    });

    if (!task) {
      throw new AppError('Task not found or action already taken', 404);
    }

    if (action === "end_task") {
      // Find and end active session
      const activeSession = await prisma.workingHours.findFirst({
        where: {
          task_id: taskId,
          ended_at: null,
        }
      });

      if (activeSession) {
        const now = new Date();
        const duration = secondsBetween(activeSession.started_at, now);

        await prisma.workingHours.update({
          where: { id: activeSession.id },
          data: {
            ended_at: now,
            duration_seconds: duration,
          }
        });
      }

      // Mark action taken
      await prisma.task.update({
        where: { id: taskId },
        data: {
          autoCloseActionTaken: true,
          autoCloseActionAt: new Date(),
          autoCloseActionType: "end_task"
        }
      });

      res.status(200).json({
        status: 'success',
        message: 'Task ended successfully'
      });

    } else if (action === "request_more_hours") {
      // Send notification to manager
      const project = await prisma.project.findUnique({
        where: { id: task.project_id },
        select: { managerID: true, name: true }
      });

      if (project?.managerID) {
        const managerPayload = {
          type: "TASK_HOURS_EXTENSION_REQUEST",
          title: "Hours Extension Request",
          message: `${req.user?.firstName} ${req.user?.lastName} is requesting additional hours for task '${task.name}' in project '${project.name}'. Current session duration: ${((new Date().getTime() - task.start_date.getTime()) / 3600000).toFixed(1)} hours.`,
          taskId: taskId,
          employeeId: userId,
          projectId: task.project_id,
          requestedAt: new Date()
        };

        const { sendNotification } = await import("../../utils/sendNotification");
        await sendNotification(project.managerID, managerPayload);
      }

      // Mark action taken
      await prisma.task.update({
        where: { id: taskId },
        data: {
          autoCloseActionTaken: true,
          autoCloseActionAt: new Date(),
          autoCloseActionType: "request_more_hours"
        }
      });

      res.status(200).json({
        status: 'success',
        message: 'Hours extension request sent to manager'
      });
    }
  })
);

export default router;
