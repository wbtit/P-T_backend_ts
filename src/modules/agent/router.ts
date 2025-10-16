import {Router} from "express"
import { agnetQueryController } from "./controller/agentController";
import authMiddleware from "../../middleware/authMiddleware"

const router = Router();

router.post("/query",authMiddleware,agnetQueryController);

export {router as agentRoutes}