import prisma from "../../../config/database/client";
import { createTaskInput, updateTaskInput } from "../dtos";
import { cleandata } from "../../../config/utils/cleanDataObject";

export class TaskRepository {
    async create(data: createTaskInput) {
        const cleanData = cleandata(data)
        // Validate project_bundle_id if provided
        if (cleanData.project_bundle_id) {
            const bundleExists = await prisma.projectBundle.findUnique({
                where: { id: cleanData.project_bundle_id }
            });
            if (!bundleExists) {
                throw new Error("Invalid project_bundle_id: ProjectBundle not found");
            }
        }
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
                    project_bundle_id: cleanData.project_bundle_id,
                    wbsType: cleanData.wbsType
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
                alert: true,
                flags: true,
                taskcomment:{
                    include:{
                        user:{select:{firstName:true,lastName:true,middleName:true}
                    },
                }
                },
                projectBundle: true,
                allocationLog:{ select:{ allocatedHours:true } }
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
                allocationLog:{ select:{ allocatedHours:true } }
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
                allocationLog:{ select:{ allocatedHours:true } }
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
                allocationLog:{ select:{ allocatedHours:true } }
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
                allocationLog:{ select:{ allocatedHours:true } }
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
                allocationLog:{ select:{ allocatedHours:true } }
            }
        });
        return tasks;
    }

    async update(id: string, data: updateTaskInput) {
        await prisma.$transaction(async (tx) => {
            const task = await tx.task.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    mileStone_id: data.mileStone_id,
                    status: data.status,
                    priority: data.priority,
                    due_date: data.due_date,
                    start_date: data.start_date,
                    userFault: data.userFault,
                    Stage: data.Stage,
                    project_id: data.project_id,
                    user_id: data.user_id,
                    departmentId: data.departmentId,
                    reworkStartTime: data.reworkStartTime,
                    project_bundle_id: data.project_bundle_id
                }
            });

            if (data.duration !== undefined) {
                await tx.taskAllocation.updateMany({
                    where: { taskId: id },
                    data: { allocatedHours: data.duration }
                });
            }

            return task;
        });
    }

    async delete(id: string) {
        const task = await prisma.task.delete({
            where: { id },
        });
        return task;
    }

    async findByProjectId(projectId: string){
        return await prisma.task.findMany({
            where:{project_id:projectId},
            include:{
                project: true,
                user: true,
                department: true,
                workingHourTask: true,
                allocationLog:{ select:{ allocatedHours:true } }
            }
        })
    }
}   