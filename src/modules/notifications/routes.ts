import { NotificationController } from "./controller";
import {Router} from "express"
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import z from "zod"

const notifyCtrlr= new NotificationController()

const router = Router();

router.get("/", 
    authMiddleware,
    asyncHandler(notifyCtrlr.get.bind(notifyCtrlr)));


router.patch("/read/:notificationId", 
    authMiddleware,
    validate({params: z.object({ notificationId: z.string() })}),
    asyncHandler(notifyCtrlr.update.bind(notifyCtrlr)));

export {router as NotificationRouter}
