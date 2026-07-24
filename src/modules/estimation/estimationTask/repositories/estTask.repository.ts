import prisma from "../../../../config/database/client";
import { cleandata } from "../../../../config/utils/cleanDataObject";
import { createEstimationTaskInput,updateEstimationTaskInput } from "../dtos";
import { Prisma } from "@prisma/client";

const userNameSelect = {
    id: true,
    firstName: true,
    middleName: true,
    lastName: true,
    username: true,
    email: true,
} as const;

const estimationTaskInclude = {
    workinghours: true,
    assignedBy: { select: userNameSelect },
    assignedTo: { select: userNameSelect },
    reviewedBy: { select: userNameSelect },
    estimation: {
        select: {
            id: true,
            serialNo: true,
            estimationNumber: true,
            projectName: true,
            fabricatorName: true,
            projectComplexity: true,
            status: true,
            estimateDate: true,
            finalHours: true,
            finalWeeks: true,
            finalPrice: true,
            tools: true,
            fabricators: { select: { id: true, fabName: true } },
            rfq: { select: { id: true, serialNo: true, files: true } },
        },
    },
    comment: {
        include: {
            user: { select: userNameSelect },
            reads: true,
        },
        orderBy: { created_on: 'desc' }
    },
} as const;

type EstimationTaskWithFrontendDetails = Prisma.EstimationTaskGetPayload<{
    include: typeof estimationTaskInclude;
}>;

const formatUserName = (user?: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    username?: string | null;
} | null) =>
    [user?.firstName, user?.middleName, user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || user?.username || "N/A";

const addFrontendDetails = (task: EstimationTaskWithFrontendDetails) => ({
    ...task,
    frontendDetails: {
        taskName: task.serialNo || "Estimation Task",
        projectName: task.estimation.projectName,
        estimationNumber: task.estimation.estimationNumber,
        estimationSerialNo: task.estimation.serialNo,
        assignedByName: formatUserName(task.assignedBy),
        assignedToName: formatUserName(task.assignedTo),
        reviewedByName: formatUserName(task.reviewedBy),
        fabricatorName: task.estimation.fabricators?.fabName || task.estimation.fabricatorName || "N/A",
        status: task.status,
        startDate: task.startDate,
        endDate: task.endDate,
        dueDate: task.endDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        notes: task.notes,
        reviewNotes: task.reviewNotes,
    },
});

export class EstimationTaskRepository{
    async create(
        data: createEstimationTaskInput & { serialNo: string },
        assignedById: string
    ) {
        return this.createWithTx(prisma, data, assignedById);
    }
    async createWithTx(
        tx: Prisma.TransactionClient | typeof prisma,
        data: createEstimationTaskInput & { serialNo: string },
        assignedById: string
    ) {
        const cleanData = cleandata(data);
        const task = await tx.estimationTask.create({
            data: {
                ...cleanData,
                assignedById: assignedById
            },
            include: estimationTaskInclude,
        });
        return addFrontendDetails(task);
    }
    async review(id:string,data:updateEstimationTaskInput,reviewerId:string){
        const task = await prisma.estimationTask.update({
            where:{id},
            data:{
                ...data,
                reviewedById:reviewerId
            },
            include: estimationTaskInclude,
        });
        return addFrontendDetails(task);
            
    }
    async getAll(){
        const tasks = await prisma.estimationTask.findMany({
            include: estimationTaskInclude,
            orderBy: { createdAt: "desc" },
        });
        return tasks.map(addFrontendDetails);
    }
    async getById(id:string){
        const task = await prisma.estimationTask.findFirst({
            where:{id},
            include: estimationTaskInclude,
        });
        return task ? addFrontendDetails(task) : null;
    }
    async getMyTask(userId:string){
        const tasks = await prisma.estimationTask.findMany({
        where:{
          assignedToId:userId,
          status: { notIn: ["IN_REVIEW", "COMPLETED"] }  
        },
        include: estimationTaskInclude,
        orderBy: { createdAt: "desc" },
        });
        return tasks.map(addFrontendDetails);
    }
    async getMyAllTask(userId:string){
        const tasks = await prisma.estimationTask.findMany({
        where:{
          assignedToId:userId 
        },
        include: estimationTaskInclude,
        orderBy: { createdAt: "desc" },
        });
        return tasks.map(addFrontendDetails);
    }
    async update(id:string,data:updateEstimationTaskInput){
        const task = await prisma.estimationTask.update({
            where:{id},
            data:data,
            include: estimationTaskInclude,
        });
        return addFrontendDetails(task);
    }
    async delete(id:string){
        return await prisma.estimationTask.delete({
                where:{id}
            })
    }
}
