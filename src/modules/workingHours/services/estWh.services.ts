import { EstimationWHRepository } from "../repositories";
import { FindWhDTO, CreateWhDTO, UpdateWhDTO, FindManyDTO } from "../dtos/wh.dto";
import prisma from "../../../config/database/client";
import { secondsBetween } from "../utils/calculateSecs";
import { EstimationTaskRepository } from "../../estimation/estimationTask/repositories/estTask.repository";

const whRepository = new EstimationWHRepository();
const estTaskRepository = new EstimationTaskRepository();

export class EstWHService {

    // -------------------------
    // START TASK
    // -------------------------
    async startTask(findData: FindWhDTO,estimationTaskId:string,userId:string) {
        // Validate that the estimation task exists
        const task = await estTaskRepository.getById(estimationTaskId);
        if (!task) {
            throw new Error("Estimation task not found.");
        }

        const active = await whRepository.findFirst(findData);
        if (active) {
            throw new Error("You already have an active session. Please end it before starting a new one.");
        }

        const wh = await whRepository.create(
            userId,
            estimationTaskId,
        );

        await prisma.estimationTask.update({
            where: { id:estimationTaskId },
            data: { status: "IN_PROGRESS" }
        });

        return wh;
    }

    // -------------------------
    // PAUSE TASK
    // -------------------------
    async pauseTask(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if (!active) throw new Error("No active task session found to pause.");

        const now = new Date();
        const duration = secondsBetween(active.started_at, now);

        const wh = await whRepository.closeSession({
            id: active.id,
            ended_at: now,
            duration_seconds: duration
        });

        await prisma.estimationTask.update({
            where: { id: findData.estimationTaskId },
            data: { status: "BREAK" }
        });

        return wh;
    }

    // -------------------------
    // RESUME TASK
    // -------------------------
    async resumeTask(findData: FindWhDTO,estimationTaskId:string,userId:string) {
        // Validate that the estimation task exists
        const task = await estTaskRepository.getById(estimationTaskId);
        if (!task) {
            throw new Error("Estimation task not found.");
        }

        const active = await whRepository.findFirst(findData);
        if (active) throw new Error("You already have an active session. Please pause/end it first.");

        const wh = await whRepository.create(
            userId,
            estimationTaskId
        );

        await prisma.estimationTask.update({
            where: { id: estimationTaskId },
            data: { status: "IN_PROGRESS" }
        });

        return wh;
    }

    // -------------------------
    // END TASK
    // -------------------------
    async endTask(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);
        if (!active) throw new Error("No active session found to end.");

        const now = new Date();
        const duration = secondsBetween(active.started_at, now);

        const wh = await whRepository.closeSession({
            id: active.id,
            ended_at: now,
            duration_seconds: duration
        });

        await prisma.estimationTask.update({
            where: { id: findData.estimationTaskId },
            data: { status: "COMPLETED" }
        });

        return wh;
    }

    // -------------------------
    // START REWORK
    // -------------------------
    async startRework(findData: FindWhDTO,estimationTaskId:string,userId:string) {
        // Validate that the estimation task exists
        const task = await estTaskRepository.getById(estimationTaskId);
        if (!task) {
            throw new Error("Estimation task not found.");
        }

        const active = await whRepository.findFirst(findData);

        // If an active session exists, close it first
        if (active) {
            const now = new Date();
            const duration = secondsBetween(active.started_at, now);

            await whRepository.closeSession({
                id: active.id,
                ended_at: now,
                duration_seconds: duration
            });
        }

        await prisma.estimationTask.update({
            where: { id: estimationTaskId },
            data: { status: "REWORK" }
        });

        return await whRepository.create(
            userId,
            estimationTaskId
        );
    }

    // -------------------------
    // END REWORK
    // -------------------------
    async endRework(findData: FindWhDTO, updateData: UpdateWhDTO) {
        const active = await whRepository.findFirst(findData);

        if (!active || active.type !== "REWORK") {
            throw new Error("No active REWORK session found to end.");
        }

        const now = new Date();
        const duration = secondsBetween(active.started_at, now);

        const wh = await whRepository.closeSession({
            id: active.id,
            ended_at: now,
            duration_seconds: duration
        });

        await prisma.estimationTask.update({
            where: { id: findData.estimationTaskId },
            data: { status: "COMPLETED" }
        });

        return wh;
    }

    // -------------------------
    // TASK SUMMARY
    // -------------------------
    async getTaskSummary(data: FindManyDTO) {
        const now = new Date();
        const segments = await whRepository.findManyByTaskIdAndUserId(data);

        let work = 0;
        let rework = 0;
        let activeSession: any = null;

        for (const segment of segments) {

            if (segment.ended_at === null) {
                activeSession = segment;
            }

            const end = segment.ended_at ?? now;
            const duration = segment.duration_seconds ??
                secondsBetween(segment.started_at, end);

            if (segment.type === "WORK") work += duration;
            else if (segment.type === "REWORK") rework += duration;
        }

        const total = work + rework;

        // Fetch allocated hours (if exists)
        const allocation = await prisma.estimationTaskAllocation.findUnique({
            where: { EstimationtaskId: data.estimationTaskId }
        });

        return {
            totalSeconds: total,
            workSeconds: work,
            reworkSeconds: rework,

            // Active status info
            isActive: activeSession != null,
            activeSessionStartedAt: activeSession?.started_at ?? null,

            // Allocated hours
            allocatedHours: allocation?.allocatedHours ?? null,

            totalHours: (total / 3600).toFixed(2),
            workHours: (work / 3600).toFixed(2),
            reworkHours: (rework / 3600).toFixed(2),
            totalMinutes: Math.floor(total / 60),
        };
    }
}
