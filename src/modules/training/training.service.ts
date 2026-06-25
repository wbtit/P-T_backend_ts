import prisma from "../../config/database/client";
import { AppError } from "../../config/utils/AppError";
import { sendNotification } from "../../utils/sendNotification";
import { Prisma } from "@prisma/client";

export class TrainingService {
  async raiseTrainingRequest(userId: string, data: { taskId: string; topic: string; reason: string }) {
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: { project: true }
    });

    if (!task) throw new AppError("Task not found", 404);

    const request = await prisma.trainingRequest.create({
      data: {
        taskId: data.taskId,
        raisedById: userId,
        topic: data.topic,
        reason: data.reason,
        status: "PENDING"
      }
    });

    const managersToNotify = await prisma.user.findMany({
      where: {
        OR: [
          { id: task.project.managerID },
          { role: "ADMIN" },
          { role: "OPERATION_EXECUTIVE" },
          { role: "DEPT_MANAGER", departmentId: task.departmentId },
          { role: "DEPUTY_MANAGER", departmentId: task.departmentId }
        ],
        isActive: true
      }
    });

    for (const manager of managersToNotify) {
      await sendNotification(manager.id, {
        type: "NEW_TRAINING_REQUEST",
        title: "New Training Request",
        message: `A training request has been raised on topic: '${data.topic}'`,
        requestId: request.id,
        taskId: data.taskId,
        timestamp: new Date()
      });
    }

    return request;
  }

  async approveTrainingRequest(approverId: string, requestId: string, data: { estimatedHours: string; dueDate: Date; name: string; description: string }) {
    const request = await prisma.trainingRequest.findUnique({
      where: { id: requestId },
      include: { task: true }
    });

    if (!request) throw new AppError("Training request not found", 404);
    if (request.status !== "PENDING") throw new AppError("Training request is no longer PENDING", 409);

    const result = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          taskType: "TRAINING",
          trainingRequestId: requestId,
          name: data.name,
          description: data.description,
          user_id: request.raisedById,
          status: "ASSIGNED",
          due_date: data.dueDate,
          start_date: new Date(),
          project_id: request.task.project_id,
          departmentId: request.task.departmentId,
          created_by: approverId,
          priority: request.task.priority,
          Stage: "IFA" 
        }
      });

      await tx.taskAllocation.create({
        data: {
          taskId: newTask.id,
          allocatedHours: data.estimatedHours,
          createdBy: approverId
        }
      });

      const updatedRequest = await tx.trainingRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approvedById: approverId,
          linkedTrainingTaskId: newTask.id,
          resolvedAt: new Date()
        }
      });

      return { newTask, updatedRequest };
    });

    await sendNotification(request.raisedById, {
      type: "TRAINING_REQUEST_APPROVED",
      title: "Training Request Approved",
      message: `Your training request for '${request.topic}' was approved and assigned.`,
      requestId: request.id,
      taskId: result.newTask.id,
      timestamp: new Date()
    });

    return result;
  }

  async rejectTrainingRequest(approverId: string, requestId: string, data: { rejectionReason: string }) {
    const request = await prisma.trainingRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) throw new AppError("Training request not found", 404);
    if (request.status !== "PENDING") throw new AppError("Training request is no longer PENDING", 409);

    const updatedRequest = await prisma.trainingRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        approvedById: approverId,
        rejectionReason: data.rejectionReason,
        resolvedAt: new Date()
      }
    });

    await sendNotification(request.raisedById, {
      type: "TRAINING_REQUEST_REJECTED",
      title: "Training Request Rejected",
      message: `Your training request for '${request.topic}' was rejected. Reason: ${data.rejectionReason}`,
      requestId: request.id,
      timestamp: new Date()
    });

    return updatedRequest;
  }
}
