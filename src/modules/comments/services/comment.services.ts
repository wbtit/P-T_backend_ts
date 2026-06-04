import { commentDto } from "../dtos";
import { CommentRepository } from "../repositories";
import prisma from "../../../config/database/client";

const commentRepo= new CommentRepository();

export class CommentService{
    async create(data:commentDto,user_id:string){
        const comment = await commentRepo.create(data,user_id);

        // Step 2 - Auto-mark comment author as read
        await prisma.commentRead.create({
            data: {
                commentId: comment.id,
                userId: user_id
            }
        });

        // Background task comment notification
        (async () => {
            try {
                if (comment.task_id) {
                    const task = await prisma.task.findUnique({
                        where: { id: comment.task_id },
                        include: {
                            project: true,
                            department: {
                                include: {
                                    managerIds: true,
                                }
                            },
                        }
                    });

                    if (task) {
                        const commentCreator = await prisma.user.findUnique({
                            where: { id: user_id },
                            select: { firstName: true, lastName: true }
                        });

                        const creatorName = commentCreator 
                            ? `${commentCreator.firstName} ${commentCreator.lastName}` 
                             : "A user";

                        // Set of unique recipient user IDs
                        const recipients = new Set<string>();

                        // 1. Task's assigned user
                        if (task.user_id) recipients.add(task.user_id);

                        // 2. Project Manager
                        if (task.project?.managerID) recipients.add(task.project.managerID);

                        // 3. Task Creator / Assigner
                        if (task.created_by) recipients.add(task.created_by);

                        // 4. Dept Manager & Deputy Manager from the task's department
                        if (task.department?.managerIds) {
                            task.department.managerIds.forEach((m) => {
                                if (m.role === "DEPT_MANAGER" || m.role === "DEPUTY_MANAGER") {
                                    recipients.add(m.id);
                                }
                            });
                        }

                        // Exclude comment creator from getting their own notification
                        recipients.delete(user_id);

                        if (recipients.size > 0) {
                            const { sendNotification } = await import("../../../utils/sendNotification");
                            const notificationPayload = {
                                type: "COMMENT_ADDED",
                                title: "New Task Comment",
                                message: `${creatorName} commented on task "${task.name}": "${comment.data}"`,
                                taskId: task.id,
                                projectId: task.project_id,
                                projectName: task.project?.name || "N/A",
                                timestamp: new Date(),
                            };

                            for (const recipientId of recipients) {
                                await sendNotification(recipientId, notificationPayload);

                                // Step 5 - Emit real-time comment notification via Socket.IO
                                if ((globalThis as any).io) {
                                    (globalThis as any).io.to(`user:${recipientId}`).emit('new_task_comment', {
                                        taskId: comment.task_id,
                                        commentId: comment.id,
                                        authorId: user_id,
                                        preview: comment.data.substring(0, 100)
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error sending comment notification:", error);
            }
        })();

        return comment;
    }

    async update(id:string){
        return await commentRepo.update(id);
    }

    async findByTask(id:string){
        return await commentRepo.getByTaskId(id);
    }

    async findByUserId(id:string){
        return await commentRepo.getByUserId(id);
    }

    // Step 3 - Function 1: getUnreadCommentsForUser (Employee View)
    async getUnreadCommentsForUser(userId: string) {
        const MANAGER_ROLES = [
            'ADMIN', 'SYSTEM_ADMIN', 'DEPT_MANAGER', 'DEPUTY_MANAGER',
            'PROJECT_MANAGER', 'PROJECT_MANAGER_OFFICER', 'TEAM_LEAD', 'ESTIMATION_HEAD'
        ];

        return await prisma.comment.findMany({
            where: {
                task: { user_id: userId },
                user: { role: { in: MANAGER_ROLES as any } },
                reads: { none: { userId } }
            },
            include: {
                user: { select: { id: true, username: true, role: true } },
                task: { select: { id: true, name: true, serialNo: true } }
            },
            orderBy: { created_on: 'desc' }
        });
    }

    // Step 3 - Function 2: getUnreadCommentsForManager (Manager View)
    async getUnreadCommentsForManager(managerId: string) {
        const MANAGER_ROLES = [
            'ADMIN', 'SYSTEM_ADMIN', 'DEPT_MANAGER', 'DEPUTY_MANAGER',
            'PROJECT_MANAGER', 'PROJECT_MANAGER_OFFICER', 'TEAM_LEAD', 'ESTIMATION_HEAD'
        ];

        return await prisma.comment.findMany({
            where: {
                OR: [
                    { task: { created_by: managerId } },
                    { task: { project: { managerID: managerId } } }
                ],
                user: { role: { notIn: MANAGER_ROLES as any } },
                reads: { none: { userId: managerId } }
            },
            include: {
                user: { select: { id: true, username: true, role: true } },
                task: { select: { id: true, name: true, serialNo: true } }
            },
            orderBy: { created_on: 'desc' }
        });
    }

    // Step 3 - Function 3: markCommentsAsRead
    async markCommentsAsRead(userId: string, commentIds: string[]) {
        const result = await prisma.commentRead.createMany({
            data: commentIds.map(commentId => ({ commentId, userId })),
            skipDuplicates: true
        });
        return { marked: result.count };
    }
}