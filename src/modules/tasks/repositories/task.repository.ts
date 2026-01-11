import prisma from "../../../config/database/client";
import { createTaskInput, updateTaskInput } from "../dtos";
import { cleandata } from "../../../config/utils/cleanDataObject";

export class TaskRepository {
    async create(data: createTaskInput) {
        const cleanData = cleandata(data)
        await prisma.$transaction(async (tx) => {
            const task = await tx.task.create({
                data: {
                    name: cleanData.name,
                    description: cleanData.description,
                    mileStone_id: cleanData.mileStone_id,
                    status: cleanData.status,
                    priority: cleanData.priority,
                    due_date: cleanData.due_date,
                    start_date: cleanData.start_date,
                    userFault: cleanData.userFault,
                    Stage: cleanData.Stage,
                    project_id: cleanData.project_id,
                    user_id: cleanData.user_id,
                    departmentId: cleanData.departmentId,
                    reworkStartTime: cleanData.reworkStartTime,
                    created_by: cleanData.user_id,
                    project_bundle_id: cleanData.project_bundle_id
                }
            })

            await tx.taskAllocation.create({
                data: {
                    taskId: task.id,
                    allocatedHours: cleanData.duration,
                    createdBy: cleanData.user_id
                }
            })
            return task;
        })
    }

    async findById(id: string) {
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                project: true,
                user: true,
                department: true,
                workingHourTask: true,
                allocationLog: true,
                alert: true,
                flags: true,
                taskcomment: true,
                projectBundle: true
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
            include: {
                project: true,
                user: true,
                department: true,
                workingHourTask: true,
            }
        });
        return tasks;
    }
    async findTasksForDepartmentManager(departmentManagerId: string) {
        const tasks = await prisma.task.findMany({
            where: {
                department: {
                    managerIds: {
                        some: { id: departmentManagerId }
                    }
                }
            },
            include: {
                project: true,
                user: true,
                department: true,
                workingHourTask: true,
            }
        });
        return tasks;
    }

    async findTasksByProjectManagerId(projectManagerId: string) {
        const tasks = await prisma.task.findMany({
            where: {
                project: {
                    managerID: projectManagerId
                }
            },
            include: {
                project: true,
                user: true,
                department: true,
                workingHourTask: true,
            }
        });
        return tasks;
    }

    async getAlltasksByUserId(user_id: string) {
        const tasks = await prisma.task.findMany({
            where: { user_id },
            include: {
                project: true,
                user: true,
                department: true,
                workingHourTask: true,
            }
        });
        return tasks;
    }

    async findAll() {
        const tasks = await prisma.task.findMany({
            include: {
                project: {
                    select: {
                        name: true, manager: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                },
                user: { select: { firstName: true, middleName: true, lastName: true } },
                department: { select: { name: true } },
                workingHourTask: true,
            }
        });
        return tasks;
    }

    async update(id: string, data: updateTaskInput) {
        const task = await prisma.task.update({
            where: { id },
            data,
            include: {
                project: true,
                user: true,
                department: true,
                workingHourTask: true,
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