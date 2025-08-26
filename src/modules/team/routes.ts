import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { TeamController } from "./controllers";
import { CreateTeamSchema } from "./dtos";
import z from "zod";

const teamController = new TeamController();

const router = Router();

router.post("/",
     authMiddleware, 
     validate({body: CreateTeamSchema}), 
     teamController.create.bind(teamController));

router.get("/:id", 
    authMiddleware, 
    validate({params:z.object({id:z.string()})}), 
    teamController.getById.bind(teamController));

router.get("/", 
    authMiddleware, 
    teamController.getAll.bind(teamController));

router.put("/:id", 
    authMiddleware, 
    validate({params:z.object({id:z.string()})}), 
    teamController.update.bind(teamController));

router.delete("/:id", 
    authMiddleware, 
    validate({params:z.object({id:z.string()})}), 
    teamController.delete.bind(teamController));

export default router;
