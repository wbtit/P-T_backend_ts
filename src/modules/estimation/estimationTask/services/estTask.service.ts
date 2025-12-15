import { EstimationTaskRepository } from "../repositories";
import { createEstimationTaskInput, updateEstimationTaskInput } from "../dtos";
import { AppError } from "../../../../config/utils/AppError";

export class EstimationTaskService {
    private estimationTaskRepo: EstimationTaskRepository;

    constructor() {
        this.estimationTaskRepo = new EstimationTaskRepository();
    }

    async createTask(data: createEstimationTaskInput, assignedById: string) {
        // You could add additional business logic or validation here
        return await this.estimationTaskRepo.create(data, assignedById);
    }

    async reviewTask(taskId: string, data: updateEstimationTaskInput, reviewerId: string) {
        // Business logic for reviewer validation can be added here
        return await this.estimationTaskRepo.review(taskId, data, reviewerId);
    }

    async getAllTasks() {
        return await this.estimationTaskRepo.getAll();
    }

    async getTaskById(taskId: string) {
        const task = await this.estimationTaskRepo.getById(taskId);
        if (!task) {
            throw new AppError("Estimation task not found",400);
        }
        return task;
    }

    async getUserTasks(userId: string) {
        return await this.estimationTaskRepo.getMyTask(userId);
    }
    async getUserAllTasks(userId: string) {
        return await this.estimationTaskRepo.getMyAllTask(userId);
    }
    async updateTask(taskId: string, data: updateEstimationTaskInput) {
        // Optionally validate if task exists before updating
        return await this.estimationTaskRepo.update(taskId, data);
    }

    async deleteTask(taskId: string) {
        // Optional validation before delete
        return await this.estimationTaskRepo.delete(taskId);
    }
}
