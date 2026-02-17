import { EstimationTaskRepository } from "../repositories";
import { createEstimationTaskInput, updateEstimationTaskInput } from "../dtos";
import { AppError } from "../../../../config/utils/AppError";
import prisma from "../../../../config/database/client";
import {
    extractProjectToken,
    generateParentScopedSerial,
    SERIAL_PREFIX,
} from "../../../../utils/serial.util";

export class EstimationTaskService {
    private estimationTaskRepo: EstimationTaskRepository;

    constructor() {
        this.estimationTaskRepo = new EstimationTaskRepository();
    }

    async createTask(data: createEstimationTaskInput, assignedById: string) {
        return await prisma.$transaction(async (tx) => {
            const estimation = await tx.estimation.findUnique({
                where: { id: data.estimationId },
                select: { id: true, serialNo: true },
            });

            if (!estimation) {
                throw new AppError("Estimation not found", 404);
            }

            if (!estimation.serialNo) {
                throw new AppError("Estimation serial number is missing", 400);
            }

            const serialNo = await generateParentScopedSerial(tx, {
                childPrefix: SERIAL_PREFIX.ESTIMATION_TASK,
                parentPrefix: SERIAL_PREFIX.ESTIMATION,
                parentScopeId: estimation.id,
                parentSerialNo: estimation.serialNo,
                projectToken: extractProjectToken(estimation.serialNo),
            });

            return this.estimationTaskRepo.createWithTx(
                tx,
                {
                    ...data,
                    serialNo,
                },
                assignedById
            );
        });
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
