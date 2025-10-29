import { TaskService } from "./services";
import prisma from "../../config/database/client";

const taskService = new TaskService()
export const TaskIntents = {
  GET_ALL_TASKS: async () => taskService.getAllTasks(),
  GET_TASK_BY_ID: async (taskname:string,userId:string) =>{
    return await prisma.task.findFirst({where:{name:taskname,user_id:userId}})
  },

};
