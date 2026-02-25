import prisma from "../../../config/database/client";
import { createTaskInput, updateTaskInput } from "../dtos";
import { cleandata } from "../../../config/utils/cleanDataObject";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

export class TaskRepository {
    async create(data: createTaskInput, createdBy: string) {
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
        return await prisma.$transaction(async (tx) => {
            const project = await tx.project.findUnique({
                where: { id: cleanData.project_id },
                select: { projectCode: true, projectNumber: true },
            });
            if (!project) {
                throw new AppError("Project not found for task serial generation", 404);
            }
            const task = await tx.task.create({
                data: {
                    serialNo: await generateProjectScopedSerial(tx, {
                        prefix: SERIAL_PREFIX.TASK,
                        projectScopeId: cleanData.project_id,
                        projectToken: project.projectCode ?? project.projectNumber,
                    }),
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
                    created_by: createdBy,
                    project_bundle_id: cleanData.project_bundle_id,
                    wbsType: cleanData.wbsType
                }
            })

            await tx.taskAllocation.create({
                data: {
                    taskId: task.id,
                    allocatedHours: cleanData.duration,
                    createdBy
                }
            })
            return task;
        })
    }

    async findLatestPotentialDuplicate(data: createTaskInput) {
        const cleanName = data.name.trim();
        const cleanDescription = data.description.trim();

        return prisma.task.findFirst({
            where: {
                project_id: data.project_id,
                user_id: data.user_id,
                Stage: data.Stage,
                name: {
                    equals: cleanName,
                    mode: "insensitive",
                },
                description: {
                    equals: cleanDescription,
                    mode: "insensitive",
                },
                mileStone_id: data.mileStone_id ?? null,
                project_bundle_id: data.project_bundle_id ?? null,
            },
            orderBy: {
                created_on: "desc",
            },
            include: {
                project: {
                    select: {
                        name: true,
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        middleName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    async findOperationExecutives() {
        return prisma.user.findMany({
            where: {
                role: "OPERATION_EXECUTIVE",
                isActive: true,
            },
            select: {
                id: true,
            },
        });
    }

    async findUserNameById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                firstName: true,
                middleName: true,
                lastName: true,
            },
        });
    }

    async createDuplicateAssignmentFlag(params: {
        taskId: string;
        managerId: string;
        assigneeId: string;
        severity: number;
        reason: string;
    }) {
        return prisma.taskFlag.create({
            data: {
                taskId: params.taskId,
                managerId: params.managerId,
                userId: params.assigneeId,
                type: "MANAGER_OVER_ALLOCATED",
                severity: params.severity,
                reason: params.reason,
            },
        });
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
                taskcomment:{
                    select:{acknowledged:true}
                },
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
            taskcomment:{
                    select:{acknowledged:true}
                },
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

    async getAlltasksByUserId(user_id: string) {
        const tasks = await prisma.task.findMany({
            where: { user_id },
            include: {
                taskcomment:{
                    select:{acknowledged:true}
                },
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
                taskcomment:{
                    select:{acknowledged:true}
                },
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
                allocationLog:{ select:{ allocatedHours:true } },
                
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

            // Only update allocation hours if duration is explicitly provided
            if (data.duration !== undefined) {
                await tx.taskAllocation.create({
                    data: {
                        taskId: task.id,
                        allocatedHours: data.duration,
                        createdBy: data.user_id??""
                    }
                });
            }
            // Otherwise, keep existing allocation hours unchanged

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

    async findAllByUserId(user_id: string) {
        const tasks = await prisma.task.findMany({
            where: { user_id },
            include: {
                project:{
                    select:{
                        name:true,
                        manager:{
                            select:{
                                firstName:true,
                                lastName:true
                            }
                        }
                    }
                },
                allocationLog:{ select:{ allocatedHours:true },
                },
                workingHourTask: true,
            }
        });
         if (!tasks) {
      throw new AppError("No tasks found for the user", 404);
    }
    return tasks;
    }   
}   
