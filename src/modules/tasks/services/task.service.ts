import { AppError } from "../../../config/utils/AppError";
import { TaskRepository } from "../repositories/task.repository";
import { createTaskInput, updateTaskInput } from "../dtos";

export class TaskService {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  async createTask(data: createTaskInput) {
    const task = await this.taskRepository.create(data);
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
}