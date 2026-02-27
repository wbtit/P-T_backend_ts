import { AppError } from "../../../config/utils/AppError";
import { TaskRepository } from "../repositories/task.repository";
import { createTaskInput, updateTaskInput } from "../dtos";
import { sendNotification } from "../../../utils/sendNotification";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

export class TaskService {
  private taskRepository: TaskRepository;
  private readonly taskNotifyRoles: UserRole[] = [
    "DEPT_MANAGER",
    "PROJECT_MANAGER",
    "TEAM_LEAD",
    "OPERATION_EXECUTIVE",
  ];

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  private formatName(name?: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
  } | null) {
    return [name?.firstName, name?.middleName, name?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  async createTask(data: createTaskInput, managerId: string) {
    const duplicateTask = await this.taskRepository.findLatestPotentialDuplicate(
      data
    );
    const task = await this.taskRepository.create(data, managerId);
    await notifyByRoles(this.taskNotifyRoles, {
      type: "TASK_ASSIGNED",
      title: "Task Assigned to Employee",
      message: `Task '${task.name}' was assigned.`,
      taskId: task.id,
      assigneeId: task.user_id,
      timestamp: new Date(),
    });
    await sendNotification(task.user_id, {
      type: "TASK_ASSIGNED",
      title: "Task Assigned",
      message: `You were assigned task '${task.name}'.`,
      taskId: task.id,
      timestamp: new Date(),
    });

    if (duplicateTask) {
      const manager = await this.taskRepository.findUserNameById(managerId);
      const duplicateRecipients =
        await this.taskRepository.findDuplicateTaskRecipients();
      const severity =
        duplicateTask.status === "COMPLETED" ? "MEDIUM" : "HIGH";
      const reason =
        duplicateTask.status === "COMPLETED"
          ? "Same task details were already assigned earlier and completed."
          : "Same task details are already assigned and still active.";
      const persistedReason = `${reason} existingTaskId=${duplicateTask.id} newTaskId=${task.id} projectId=${data.project_id} assigneeId=${data.user_id}`;

      await this.taskRepository.createDuplicateAssignmentFlag({
        taskId: task.id,
        managerId,
        assigneeId: data.user_id,
        severity: severity === "HIGH" ? 3 : 2,
        reason: persistedReason,
      });

      const payload = {
        managerName: this.formatName(manager) || "Unknown",
        projectName: duplicateTask.project.name,
        userName: this.formatName(duplicateTask.user) || "Unknown",
        taskName: data.name,
        severity,
        reason,
      };

      await Promise.all(
        duplicateRecipients.map((recipientUser) =>
          sendNotification(recipientUser.id, payload)
        )
      );
    }

    return task;
  }

  async getTaskById(id: string) {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new AppError("Task not found", 404);
    }
    return task;
  }
  
  async getNonCompletedTasksByUserId(user_id: string) {
    const tasks = await this.taskRepository.findNonCompletedTasksByUserId(user_id);
    return tasks;
  }

  async getTasksForDepartmentManager(departmentManagerId: string) {
    const tasks = await this.taskRepository.findTasksForDepartmentManager(departmentManagerId);
    return tasks;
  }
  async getTasksByProjectManagerId(projectManagerId: string) {
    const tasks = await this.taskRepository.findTasksByProjectManagerId(projectManagerId);
    return tasks;
  }
  async updateTask(id: string, data: updateTaskInput) {
    const existingTask = await this.taskRepository.findById(id);
    if (!existingTask) {
      throw new AppError("Task not found", 404);
    }
    const updatedTask = await this.taskRepository.update(id, data);
    if (data.status) {
      await notifyByRoles(this.taskNotifyRoles, {
        type: data.status === "COMPLETED" ? "TASK_COMPLETED" : "TASK_STATUS_CHANGED",
        title: data.status === "COMPLETED" ? "Task Completed" : "Task Status Changed",
        message: `Task '${updatedTask.name}' status changed to '${data.status}'.`,
        taskId: updatedTask.id,
        status: data.status,
        timestamp: new Date(),
      });
      if (updatedTask.user_id) {
        await sendNotification(updatedTask.user_id, {
          type: data.status === "COMPLETED" ? "TASK_COMPLETED" : "TASK_STATUS_CHANGED",
          title: data.status === "COMPLETED" ? "Task Completed" : "Task Status Changed",
          message: `Your task '${updatedTask.name}' status changed to '${data.status}'.`,
          taskId: updatedTask.id,
          status: data.status,
          timestamp: new Date(),
        });
      }
    }
    return updatedTask;
  }

  async deleteTask(id: string) {
    const existingTask = await this.taskRepository.findById(id);
    if (!existingTask) {
      throw new AppError("Task not found", 404);
    }
    await this.taskRepository.delete(id);
    return { message: "Task deleted successfully" };
  } 

  async getAllTasks() {
    const tasks = await this.taskRepository.findAll();
    return tasks;
  }
  async getTaskByUserId(user_id: string) {
    const tasks = await this.taskRepository.getAlltasksByUserId(user_id);
    return tasks;
  }

  async getTasksByProjectId(projectId: string) {
    const tasks = await this.taskRepository.findByProjectId(projectId);
    return tasks;
  }
  async getAllTasksByUserId(user_id: string) {
    const tasks = await this.taskRepository.findAllByUserId(user_id);
    return tasks;
  }
}
