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
        });
        return task;
    }

    async findAll() {
        const tasks = await prisma.task.findMany();
        return tasks;
    }

    async update(id: string, data: updateTaskInput) {
        const task = await prisma.task.update({
            where: { id },
            data,
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