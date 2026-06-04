import authMiddleware, { AuthenticateRequest } from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { NextFunction, Response, Router } from "express";
import { createCommentSchema, markReadSchema } from "./dtos";
import { CommentController } from "./controllers";
import { asyncHandler } from "../../config/utils/asyncHandler";
import z from "zod";

const commentCtrlr = new CommentController();
const router = Router();

// roleGuard definition as requested in constraints
export const roleGuard = (roles: string[]) => 
  (req: AuthenticateRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

// Existing Routes
router.post("/",
    authMiddleware,
    validate({body:createCommentSchema}),
    asyncHandler(commentCtrlr.handleCreateComment).bind(commentCtrlr)
);

router.patch("/acknowledge/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(commentCtrlr.handleAcknowledge).bind(commentCtrlr)
);

router.get("/myComments",
    authMiddleware,
    asyncHandler(commentCtrlr.handleGetByUserId).bind(commentCtrlr)
);

// New RBA Unread Comments Routes

// GET /comment/unread/my-tasks
router.get("/unread/my-tasks",
    authMiddleware,
    asyncHandler(commentCtrlr.handleGetUnreadForUser).bind(commentCtrlr)
);

// GET /comment/unread/my-team
router.get("/unread/my-team",
    authMiddleware,
    roleGuard([
        'ADMIN', 'SYSTEM_ADMIN', 'DEPT_MANAGER', 'DEPUTY_MANAGER',
        'PROJECT_MANAGER', 'PROJECT_MANAGER_OFFICER', 'TEAM_LEAD', 'ESTIMATION_HEAD'
    ]),
    asyncHandler(commentCtrlr.handleGetUnreadForManager).bind(commentCtrlr)
);

// PATCH /comment/read
router.patch("/read",
    authMiddleware,
    validate({ body: markReadSchema }),
    asyncHandler(commentCtrlr.handleMarkAsRead).bind(commentCtrlr)
);

// Existing dynamic route placed at the end to prevent clash with static routes
router.get("/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(commentCtrlr.handleGetByTask).bind(commentCtrlr)
);

export default router;