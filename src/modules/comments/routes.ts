import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { Router } from "express";
import { createCommentSchema } from "./dtos";
import { CommentController } from "./controllers";
import { asyncHandler } from "../../config/utils/asyncHandler";
import z from "zod";

const commentCtrlr= new CommentController();
const router= Router();

router.post("/",
    authMiddleware,
    validate({body:createCommentSchema}),
    asyncHandler(commentCtrlr.handleCreateComment).bind(CommentController)
)
router.patch("/acknowldege/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(commentCtrlr.handleAcknowledge).bind(CommentController)
)
router.get("/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(commentCtrlr.handleGetByTask).bind(commentCtrlr)
)
router.get("/myComments",
    authMiddleware,
    asyncHandler(commentCtrlr.handleGetByUserId).bind(commentCtrlr)
)
export default router;