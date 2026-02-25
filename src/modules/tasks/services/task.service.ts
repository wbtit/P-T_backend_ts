import { AppError } from "../../../config/utils/AppError";
import { TaskRepository } from "../repositories/task.repository";
import { createTaskInput, updateTaskInput } from "../dtos";
import { sendNotification } from "../../../utils/sendNotification";

export class TaskService {
  private taskRepository: TaskRepository;

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

    if (duplicateTask) {
      const manager = await this.taskRepository.findUserNameById(managerId);
      const operationExecutives =
        await this.taskRepository.findOperationExecutives();
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
        operationExecutives.map((opsUser) =>
          sendNotification(opsUser.id, payload)
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
