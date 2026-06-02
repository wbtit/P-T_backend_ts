import { commentDto } from "../dtos";
import { CommentRepository } from "../repositories";
import prisma from "../../../config/database/client";

const commentRepo= new CommentRepository();

export class CommentService{
    async create(data:commentDto,user_id:string){
        const comment = await commentRepo.create(data,user_id);

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
        return await commentRepo.getByUserId(id)
    }
}