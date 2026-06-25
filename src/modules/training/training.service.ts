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

  async approveTrainingRequest(approver: { id: string, role: string, departmentId?: string | null }, requestId: string, data: { estimatedHours: string; dueDate: Date; name: string; description: string }) {
    const requestWithScope = await prisma.trainingRequest.findUnique({
      where: { id: requestId },
      include: { task: { include: { project: true } } }
    });

    if (!requestWithScope) throw new AppError("Training request not found", 404);

    const isScoped = 
      (approver.role === "PROJECT_MANAGER" && requestWithScope.task.project.managerID === approver.id) ||
      ((approver.role === "DEPT_MANAGER" || approver.role === "DEPUTY_MANAGER") && requestWithScope.task.departmentId === approver.departmentId) ||
      (approver.role === "ADMIN" || approver.role === "OPERATION_EXECUTIVE");

    if (!isScoped) {
      throw new AppError("You are not authorized to act on this training request", 403);
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.trainingRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: "APPROVED", approvedById: approver.id, resolvedAt: new Date() }
      });

      if (claimed.count === 0) {
        throw new AppError("Training request is no longer PENDING", 409);
      }

      const newTask = await tx.task.create({
        data: {
          taskType: "TRAINING",
          trainingRequestId: requestId,
          name: data.name,
          description: data.description,
          user_id: requestWithScope.raisedById,
          status: "ASSIGNED",
          due_date: data.dueDate,
          start_date: new Date(),
          project_id: requestWithScope.task.project_id,
          departmentId: requestWithScope.task.departmentId,
          created_by: approver.id,
          priority: requestWithScope.task.priority,
          Stage: "IFA" 
        }
      });

      await tx.taskAllocation.create({
        data: {
          taskId: newTask.id,
          allocatedHours: data.estimatedHours,
          createdBy: approver.id
        }
      });

      const updatedRequest = await tx.trainingRequest.update({
        where: { id: requestId },
        data: {
          linkedTrainingTaskId: newTask.id
        }
      });

      return { newTask, updatedRequest };
    });

    await sendNotification(requestWithScope.raisedById, {
      type: "TRAINING_REQUEST_APPROVED",
      title: "Training Request Approved",
      message: `Your training request for '${requestWithScope.topic}' was approved and assigned.`,
      requestId: requestWithScope.id,
      taskId: result.newTask.id,
      timestamp: new Date()
    });

    return result;
  }

  async rejectTrainingRequest(approver: { id: string, role: string, departmentId?: string | null }, requestId: string, data: { rejectionReason: string }) {
    const requestWithScope = await prisma.trainingRequest.findUnique({
      where: { id: requestId },
      include: { task: { include: { project: true } } }
    });

    if (!requestWithScope) throw new AppError("Training request not found", 404);

    const isScoped = 
      (approver.role === "PROJECT_MANAGER" && requestWithScope.task.project.managerID === approver.id) ||
      ((approver.role === "DEPT_MANAGER" || approver.role === "DEPUTY_MANAGER") && requestWithScope.task.departmentId === approver.departmentId) ||
      (approver.role === "ADMIN" || approver.role === "OPERATION_EXECUTIVE");

    if (!isScoped) {
      throw new AppError("You are not authorized to act on this training request", 403);
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const claimed = await tx.trainingRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: {
          status: "REJECTED",
          approvedById: approver.id,
          rejectionReason: data.rejectionReason,
          resolvedAt: new Date()
        }
      });

      if (claimed.count === 0) {
        throw new AppError("Training request is no longer PENDING", 409);
      }

      return await tx.trainingRequest.findUnique({ where: { id: requestId } });
    });

    await sendNotification(requestWithScope.raisedById, {
      type: "TRAINING_REQUEST_REJECTED",
      title: "Training Request Rejected",
      message: `Your training request for '${requestWithScope.topic}' was rejected. Reason: ${data.rejectionReason}`,
      requestId: requestWithScope.id,
      timestamp: new Date()
    });

    return updatedRequest;
  }
}
