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

    if (requestWithScope.batchId) {
      const batch = await prisma.trainingBatch.findUnique({ 
        where: { id: requestWithScope.batchId } 
      });
      if (batch?.status !== "TRAINING_DONE") {
        throw new AppError(
          "Cannot decide on this request until the trainer session is marked complete", 
          409
        );
      }
    }

    const isScoped = 
      (approver.role === "PROJECT_MANAGER" && requestWithScope.task.project.managerID === approver.id) ||
      ((approver.role === "DEPT_MANAGER" || approver.role === "DEPUTY_MANAGER") && requestWithScope.task.departmentId === approver.departmentId) ||
      (approver.role === "ADMIN" || approver.role === "OPERATION_EXECUTIVE");

    if (!isScoped) {
      throw new AppError("You are not authorized to act on this training request", 403);
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.trainingRequest.updateMany({
        where: { id: requestId, status: { in: ["PENDING", "AWAITING_DECISION"] } },
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

    if (requestWithScope.batchId) {
      const batch = await prisma.trainingBatch.findUnique({ 
        where: { id: requestWithScope.batchId } 
      });
      if (batch?.status !== "TRAINING_DONE") {
        throw new AppError(
          "Cannot decide on this request until the trainer session is marked complete", 
          409
        );
      }
    }

    const isScoped = 
      (approver.role === "PROJECT_MANAGER" && requestWithScope.task.project.managerID === approver.id) ||
      ((approver.role === "DEPT_MANAGER" || approver.role === "DEPUTY_MANAGER") && requestWithScope.task.departmentId === approver.departmentId) ||
      (approver.role === "ADMIN" || approver.role === "OPERATION_EXECUTIVE");

    if (!isScoped) {
      throw new AppError("You are not authorized to act on this training request", 403);
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const claimed = await tx.trainingRequest.updateMany({
        where: { id: requestId, status: { in: ["PENDING", "AWAITING_DECISION"] } },
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

  async suggestBatchableRequests(managerId: string, departmentId: string) {
    const pendingRequests = await prisma.trainingRequest.findMany({
      where: {
        status: "PENDING",
        task: { departmentId: departmentId }
      },
      include: {
        raisedBy: {
          include: {
            teamMember: {
              include: { team: true }
            }
          }
        }
      }
    });

    const grouped = pendingRequests.reduce((acc, req) => {
      const topic = req.topic.trim().toLowerCase();
      if (!acc[topic]) acc[topic] = [];
      
      const userTeam = req.raisedBy.teamMember.find(tm => tm.team.departmentID === departmentId);
      
      acc[topic].push({
        requestId: req.id,
        raisedById: req.raisedById,
        raisedByName: `${req.raisedBy.firstName} ${req.raisedBy.lastName || ''}`.trim(),
        teamName: userTeam?.team.name || null,
        requestedAt: req.requestedAt
      });
      
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([topic, requests]) => ({
      topic,
      suggestedRequests: requests
    }));
  }

  async createTrainingBatch(creator: { id: string, role: string, departmentId?: string | null }, data: {
    topic: string;
    departmentId: string;
    requestIds: string[];
    trainerId: string;
    estimatedHours: string;
    dueDate: Date;
    sessionName: string;
    sessionDescription: string;
    trainingProjectId: string;
    priority: number;
  }) {
    if (creator.role === "PROJECT_MANAGER") {
      const requestTasks = await prisma.trainingRequest.findMany({
        where: { id: { in: data.requestIds } },
        include: { task: { include: { project: true } } }
      });
      const allBelongToManager = requestTasks.every(
        r => r.task.project.managerID === creator.id
      );
      if (!allBelongToManager) {
        throw new AppError("You can only batch training requests from projects you manage", 403);
      }
    } else if (creator.role === "DEPT_MANAGER" || creator.role === "DEPUTY_MANAGER") {
      if (creator.departmentId !== data.departmentId) {
        throw new AppError("You can only batch requests within your own department", 403);
      }
    } else if (creator.role !== "ADMIN" && creator.role !== "OPERATION_EXECUTIVE") {
      throw new AppError("You are not authorized to create training batches", 403);
    }

    if (data.requestIds.length === 0) {
      throw new AppError("At least one training request must be included", 400);
    }

    const requestsToValidate = await prisma.trainingRequest.findMany({
      where: { id: { in: data.requestIds } },
      include: { task: true }
    });

    if (requestsToValidate.length !== data.requestIds.length) {
      throw new AppError("One or more training requests do not exist", 404);
    }

    const topicMismatch = requestsToValidate.some(
      r => r.topic.trim().toLowerCase() !== data.topic.trim().toLowerCase()
    );
    if (topicMismatch) {
      throw new AppError("All requests in a batch must share the same topic", 400);
    }

    const deptMismatch = requestsToValidate.some(
      r => r.task.departmentId !== data.departmentId
    );
    if (deptMismatch) {
      throw new AppError("All requests in a batch must belong to the specified department", 400);
    }

    const project = await prisma.project.findUnique({ where: { id: data.trainingProjectId } });
    if (!project) throw new AppError("Training project not found", 404);
    
    // In Project model, the relation to Department is implicitly through the many-to-many or a direct link? 
    // Wait, let's look at schema for Project model. I didn't see departmentId in Project, I need to verify.
    // I will write this check dynamically.
    const projectDepartment = await prisma.department.findFirst({
      where: {
        projects: {
          some: { id: data.trainingProjectId }
        }
      }
    });
    
    if (!projectDepartment || projectDepartment.id !== data.departmentId) {
      throw new AppError("Selected project does not belong to this department", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.trainingRequest.updateMany({
        where: { id: { in: data.requestIds }, status: "PENDING" },
        data: { status: "BATCHED" }
      });

      if (claimed.count !== data.requestIds.length) {
        throw new AppError("Some requests are no longer PENDING or do not exist.", 409);
      }

      const newBatch = await tx.trainingBatch.create({
        data: {
          topic: data.topic,
          departmentId: data.departmentId,
          status: "FINALIZED",
          createdById: creator.id
        }
      });

      const newTask = await tx.task.create({
        data: {
          taskType: "TRAINER_SESSION",
          name: data.sessionName,
          description: data.sessionDescription,
          user_id: data.trainerId,
          status: "ASSIGNED",
          due_date: data.dueDate,
          start_date: new Date(),
          project_id: data.trainingProjectId,
          departmentId: data.departmentId,
          created_by: creator.id,
          priority: data.priority,
          Stage: "IFA" 
        }
      });

      await tx.taskAllocation.create({
        data: {
          taskId: newTask.id,
          allocatedHours: data.estimatedHours,
          createdBy: creator.id
        }
      });

      await tx.trainingBatch.update({
        where: { id: newBatch.id },
        data: {
          trainerTaskId: newTask.id,
          finalizedAt: new Date()
        }
      });

      await tx.trainingRequest.updateMany({
        where: { id: { in: data.requestIds } },
        data: { batchId: newBatch.id }
      });

      return { newBatch, newTask };
    });

    await sendNotification(data.trainerId, {
      type: "TRAINER_SESSION_ASSIGNED",
      title: "New Training Session Assigned",
      message: `You've been assigned a training session for '${data.topic}' covering ${data.requestIds.length} people.`,
      taskId: result.newTask.id,
      timestamp: new Date()
    });

    const requesters = await prisma.trainingRequest.findMany({
      where: { id: { in: data.requestIds } },
      select: { raisedById: true }
    });

    for (const req of requesters) {
      await sendNotification(req.raisedById, {
        type: "TRAINING_REQUEST_BATCHED",
        title: "Training Scheduled",
        message: `Your training request for '${data.topic}' has been scheduled as part of a group session.`,
        timestamp: new Date()
      });
    }

    return result.newBatch;
  }

  async completeTrainerSession(trainerId: string, batchId: string) {
    const batch = await prisma.trainingBatch.findUnique({
      where: { id: batchId },
      include: { trainerTask: true, requests: true }
    });

    if (!batch) throw new AppError("Training batch not found", 404);
    if (batch.trainerTask?.user_id !== trainerId) {
      throw new AppError("Only the assigned trainer can mark this session complete", 403);
    }
    
    if (batch.status === "TRAINING_DONE") throw new AppError("Batch is already completed", 409);

    await prisma.$transaction(async (tx) => {
      const claimedBatch = await tx.trainingBatch.updateMany({
        where: { id: batchId, status: "FINALIZED" },
        data: { status: "TRAINING_DONE", trainingDoneAt: new Date() }
      });

      if (claimedBatch.count === 0) {
        throw new AppError("Batch could not be claimed or is not FINALIZED", 409);
      }

      await tx.trainingRequest.updateMany({
        where: { batchId: batchId, status: "BATCHED" },
        data: { status: "AWAITING_DECISION" }
      });
    });

    const uniqueApprovers = new Set<string>();
    
    for (const request of batch.requests) {
      const task = await prisma.task.findUnique({ where: { id: request.taskId }, include: { project: true } });
      if (!task) continue;

      const managers = await prisma.user.findMany({
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
      managers.forEach(m => uniqueApprovers.add(m.id));
    }

    for (const managerId of uniqueApprovers) {
      await sendNotification(managerId, {
        type: "TRAINING_BATCH_COMPLETED",
        title: "Training Session Completed",
        message: `The training session for '${batch.topic}' is complete. ${batch.requests.length} members are awaiting your final decision.`,
        timestamp: new Date()
      });
    }

    return { status: "success", message: "Training session marked as complete" };
  }
}
