import { Router } from "express";
import { TaskController } from "./controllers";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { createTaskDto,updateTaskDto } from "./dtos";
import z from "zod";
const taskController = new TaskController();

const taskRouter = Router();
taskRouter.use(authMiddleware);

taskRouter.post("/",
     validate({body:createTaskDto}),
     taskController.handleCreateTask.bind(taskController));

taskRouter.get("/getAllTasks",
    taskController.handleGetAllTasks.bind(taskController));

taskRouter.get("/user/non-completed-tasks",
    taskController.handleGetNonCompletedTasksByUserId.bind(taskController));

taskRouter.get("/user/tasks",
    taskController.handleGetTaskByUserId.bind(taskController));

taskRouter.get("/:id",
validate({params:z.object({id:z.string()})}),
    taskController.handleGetTaskById.bind(taskController));

taskRouter.put("/:id",
    validate({params:z.object({id:z.string()}) , body:updateTaskDto}),
    taskController.updateTask.bind(taskController));

taskRouter.delete("/:id",
    validate({params:z.object({id:z.string()})}),
    taskController.deleteTask.bind(taskController));

taskRouter.get("/project/:projectId",
    validate({params:z.object({projectId:z.string()})}),
    taskController.handleGetTasksByProjectId.bind(taskController));

export default taskRouter;
