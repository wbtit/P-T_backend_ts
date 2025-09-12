import prisma from "../../../config/database/client";
import { createTaskInput,updateTaskInput } from "../dtos";
import { cleandata } from "../../../config/utils/cleanDataObject";

export class TaskRepository {
    async create(data: createTaskInput) {
        const cleanData = cleandata(data)
        const task = await prisma.task.create({
            data: cleanData,
        });
        return task;
    }

    async findById(id: string) {
        const task = await prisma.task.findUnique({
            where: { id },
            include:{
                project:true,
                user:true,
                department:true,
                workingHourTask:true,
            }
        });
        return task;
    }
    async findNonCompletedTasksByUserId(user_id: string) {
        const tasks = await prisma.task.findMany({
            where: { 
                user_id,
                NOT: {
                    status: "COMPLETED"
                }
             },
             include:{
                project:true,
                user:true,
                department:true,
                workingHourTask:true,
            }
        });
        return tasks;
    }
    async getTasksForDepartmentManagerId(departmentManagerId: string) {
        const tasks = await prisma.task.findMany({
            where: {
                department: {
                    manager:{
                        some:{id: departmentManagerId}
                    }
                }
            },
            include:{
                project:true,
                user:true,
                department:true,
                workingHourTask:true,
            }
        });
        return tasks;
    }

    async getTasksByProjectManagerId(projectManagerId: string) {
        const tasks = await prisma.task.findMany({
            where: {
                project: {
                    managerID: projectManagerId
                }
            },
            include:{
                project:true,
                user:true,
                department:true,
                workingHourTask:true,
            }
        });
        return tasks;
    }

    async getAlltasksByUserId(user_id: string) {
        const tasks = await prisma.task.findMany({
            where: { user_id },
            include:{
                project:true,
                user:true,
                department:true,
                workingHourTask:true,
            }
        });
        return tasks;
    }

    async findAll() {
        const tasks = await prisma.task.findMany({
            include:{
                project:true,
                user:true,
                department:true,
                workingHourTask:true,
            }
        });
        return tasks;
    }

    async update(id: string, data: updateTaskInput) {
        const task = await prisma.task.update({
            where: { id },
            data,
            include:{
                project:true,
                user:true,
                department:true,
                workingHourTask:true,
            }
        });
        return task;
    }

    async delete(id: string) {
        const task = await prisma.task.delete({
            where: { id },
        });
        return task;
    }
}   