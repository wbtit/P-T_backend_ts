import {Router} from "express"
import  agentController from "./controller/agentController"
import authMiddleware from "../../middleware/authMiddleware"

const router = Router();

router.post("/query",authMiddleware,agentController);

export default router;