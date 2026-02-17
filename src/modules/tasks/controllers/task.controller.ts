import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { Request, Response } from "express";
import { TaskService } from "../services";
import { AppError } from "../../../config/utils/AppError";

const taskService = new TaskService();

export class TaskController {
    async handleCreateTask(req:AuthenticateRequest, res: Response) {
        const { id } = req.user || {};
        if (!id) {
            throw new AppError('User not found', 404);
        }
        const task = await taskService.createTask(req.body, id);
        res.status(201).json({
            status: 'success',
            data: task,
        });
    }

    async handleGetTaskById(req:Request, res: Response) {
        const { id } = req.params;
        const task = await taskService.getTaskById(id);
        res.status(200).json({
            status: 'success',
            data: task,
        });
    }

    async handleGetNonCompletedTasksByUserId(req:AuthenticateRequest, res: Response) {
       if (!req.user) {
    throw new AppError('User not found', 404);
    }
    const { id } = req.user;
        const tasks = await taskService.getNonCompletedTasksByUserId(id);
        res.status(200).json({
            status: 'success',
            data: tasks,
        });
    }
    async updateTask(req:Request, res: Response) {
        const { id } = req.params;
        const task = await taskService.updateTask(id, req.body);
        res.status(200).json({
            status: 'success',
            data: task,
        });
    }

    async deleteTask(req:Request, res: Response) {
        const { id } = req.params;
        const result = await taskService.deleteTask(id);
        res.status(200).json({
            status: 'success',
            data: result,
        });
    }

    async handleGetAllTasks(req:AuthenticateRequest, res: Response) {
      if (!req.user) {
    throw new AppError('User not found', 404);
    }
    const { role } = req.user;
    let results;
    if(role === 'ADMIN'|| role === 'OPERATION_EXECUTIVE'){
        results=await taskService.getAllTasks();
    }else if (role === 'DEPT_MANAGER'){
        results= await taskService.getTasksForDepartmentManager(req.user.id);
    }else if (role === 'PROJECT_MANAGER'){
        results = await taskService.getTasksByProjectManagerId(req.user.id);
    }else if(role === 'STAFF'){
        results = await taskService.getTaskByUserId(req.user.id);
    }else{
        return res.status(403).json({
            status: 'fail',
            message: 'Access denied',
        });
    }
        res.status(200).json({
            status: 'success',
            data: results,
        });
    }

   async handleGetTaskByUserId(req:AuthenticateRequest, res: Response) {
       if (!req.user) {
           throw new AppError('User not found', 404);
       }
       const { id } = req.user;
       const tasks = await taskService.getTaskByUserId(id);
       res.status(200).json({
           status: 'success',
           data: tasks,
       });
   }

   async handleGetTasksByProjectId(req:Request, res: Response) {
    const { projectId } = req.params;
    const tasks = await taskService.getTasksByProjectId(projectId);
    res.status(200).json({
        status: 'success',
        data: tasks,
    });
}

}
