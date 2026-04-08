import { AppError } from "../../../config/utils/AppError";
import { TaskRepository } from "../repositories/task.repository";
import { createTaskInput, updateTaskInput } from "../dtos";
import { sendNotification } from "../../../utils/sendNotification";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

export class TaskService {
  private taskRepository: TaskRepository;
  private readonly taskNotifyRoles: UserRole[] = [
    "DEPT_MANAGER",
    "PROJECT_MANAGER",
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
    const taskIdForBg = task.id;
    const userIdForBg = task.user_id;
    const taskNameForBg = task.name;

    // Background task assignment notification
    (async () => {
      try {
        await sendNotification(userIdForBg, {
          type: "TASK_ASSIGNED",
          title: "Task Assigned",
          message: `You were assigned task '${taskNameForBg}'.`,
          taskId: taskIdForBg,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error in createTask notification:", error);
      }
    })();

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
        type: "TASK_DUPLICATE_DETECTED",
        title: "Duplicate Task Detected",
        message: `Duplicate task detected for '${data.name}' in project '${duplicateTask.project.name}'.`,
        managerName: this.formatName(manager) || "Unknown",
        projectName: duplicateTask.project.name,
        userName: this.formatName(duplicateTask.user) || "Unknown",
        taskName: data.name,
        severity,
        reason,
        timestamp: new Date(),
      };

      const dupPayload = { ...payload };
      const dupRecipients = [...duplicateRecipients];
      
      // Background duplicate detection notifications
      (async () => {
        try {
          await Promise.all(
            dupRecipients.map((recipientUser) =>
              sendNotification(recipientUser.id, dupPayload)
            )
          );
        } catch (error) {
          console.error("Error in duplicate task notifications:", error);
        }
      })();
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
    const updStatus = data.status;
    const updTaskId = updatedTask.id;
    const updTaskName = updatedTask.name;
    const updProjectId = updatedTask.project_id;
    const updUserId = updatedTask.user_id;
    const notifyRoles = [...this.taskNotifyRoles];

    // Background status update notifications
    (async () => {
      try {
        if (updStatus !== "COMPLETED") {
          await notifyProjectStakeholdersByRole(updProjectId, notifyRoles, (role) =>
            buildRoleScopedNotification(role, {
              type: "TASK_STATUS_CHANGED",
              basePayload: { taskId: updTaskId, status: updStatus, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "Task Status Changed", message: `Task '${updTaskName}' status changed to '${updStatus}'.` },
                oversight: { title: role === "PROJECT_MANAGER" ? "Project Task Status Changed" : "Department Task Status Changed", message: `Task '${updTaskName}' status changed to '${updStatus}'.` },
                internal: { title: "Task Status Changed", message: `Task '${updTaskName}' status changed to '${updStatus}'.` },
              },
            })
          );
        }
        if (updUserId) {
          await sendNotification(updUserId, {
            type: updStatus === "COMPLETED" ? "TASK_COMPLETED" : "TASK_STATUS_CHANGED",
            title: updStatus === "COMPLETED" ? "Task Completed" : "Task Status Changed",
            message: `Your task '${updTaskName}' status changed to '${updStatus}'.`,
            taskId: updTaskId,
            status: updStatus,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error in updateTask notifications:", error);
      }
    })();
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
