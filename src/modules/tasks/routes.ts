import { Router } from "express";
import { TaskController } from "./controllers";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { createTaskDto,updateTaskDto } from "./dtos";
import z from "zod";
const taskController = new TaskController();

const taskRouter = Router();

taskRouter.post("/",
    authMiddleware,
     validate({body:createTaskDto}), 
     taskController.handleCreateTask.bind(taskController));

taskRouter.get("/:id",
    authMiddleware,
validate({params:z.object({id:z.string()})}),
    taskController.handleGetTaskById.bind(taskController));

taskRouter.get("/user/non-completed-tasks",
    authMiddleware,
    taskController.handleGetNonCompletedTasksByUserId.bind(taskController));

taskRouter.put("/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}) , body:updateTaskDto}),
    taskController.updateTask.bind(taskController));

taskRouter.delete("/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    taskController.deleteTask.bind(taskController));

taskRouter.get("/",
    authMiddleware,
    taskController.handleGetAllTasks.bind(taskController));

export default taskRouter;