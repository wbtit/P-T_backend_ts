import { AppError } from "../../../config/utils/AppError";
import { CreateMileStoneDto,UpdateMileStoneDto } from "../dtos";
import { MileStoneRepository, MileStoneVersionRepository } from "../repositories";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";

const mileStoneRepo= new MileStoneRepository();
const mileStoneVersionRepo = new MileStoneVersionRepository();
export class MileStoneService{
    async create(data:CreateMileStoneDto){
        const milestone = await mileStoneRepo.create(data);
        await mileStoneVersionRepo.createInitialVersion(milestone.id, {
            approvalDate: milestone.approvalDate,
            isConnectionDesign: milestone.isConnectionDesign,
            status: milestone.status,
            stage: milestone.stage,
            subject: milestone.subject,
            types: milestone.types,
            subSubject: milestone.subSubject,
            description: milestone.description,
        });
        return await mileStoneRepo.getById(milestone.id);
    }
    async update(id:string,data:UpdateMileStoneDto){
        const existing = await mileStoneRepo.getById(id);
        if (!existing) {
            throw new AppError("MileStone not found", 404);
        }
        return await mileStoneVersionRepo.createNewVersion(id, data);
    }
    async updateExisting(id:string,data:UpdateMileStoneDto){
        const existing = await mileStoneRepo.getById(id);
        if (!existing) {
            throw new AppError("MileStone not found", 404);
        }
        return await mileStoneRepo.update(data, id);
    }
    async getAll(user?: any){
        if (user?.role === "CLIENT_ADMIN") {
            const fabricator = await prisma.fabricator.findFirst({
                where: { pointOfContact: { some: { id: user.id } } }
            });
            if (!fabricator) return [];
            return await mileStoneRepo.getAllByFabricator(fabricator.id, user.role);
        }
        if (user?.role === "CLIENT") {
            return await mileStoneRepo.getAllForClient(user.id, user.role);
        }
        return await mileStoneRepo.getAll(user?.role);
    }
    async updateCompletion(
        id:string,
        payload: number | { completeionPercentage?: number }
    ){
        const existing = await mileStoneRepo.getById(id);
        if (!existing) {
            throw new AppError("MileStone not found", 404);
        }
        const completionPercentage =
            typeof payload === "number"
                ? payload
                : payload?.completeionPercentage;

        if (typeof completionPercentage !== "number") {
            throw new AppError("completeionPercentage is required", 400);
        }

        return await mileStoneRepo.updateCompletion(id, completionPercentage);
    }
    async getById(id:string){
        return await mileStoneRepo.getById(id)
    }
    async getByProjectId(id:string,user:any){
        if(user.role === "CONNECTION_DESIGNER_ENGINEER" || user.role === "CONNECTION_DESIGNER_ADMIN"){
            return await mileStoneRepo.getByProjectIdForConnectionDesignerEngineer(id,user.id, user.role)
        } else if (user.role === "CLIENT_ADMIN") {
            const fabricator = await prisma.fabricator.findFirst({
                where: { pointOfContact: { some: { id: user.id } } }
            });
            if (!fabricator) return [];
            return await mileStoneRepo.getByProjectIdAndFabricator(id, fabricator.id, user.role);
        } else if (user.role === "CLIENT") {
            return await mileStoneRepo.getByProjectIdAndClient(id, user.id, user.role);
        } else {
            return await mileStoneRepo.getByProject(id, user.role)
        }
    }
    async delete(id:string){
        return await mileStoneRepo.delete(id)
    }
    async getPendingSubmittals(role?: UserRole){
        return await mileStoneRepo.getPendingSubmittals(role)
    }
    async getPendingSubmittalsByFabricator(fabricatorId:string, role?: UserRole){
        return await mileStoneRepo.getPendingSubmittalsByFabricator(fabricatorId, role)
    }
    async getPendingSubmittalsByClient(clientAdminId:string, role?: UserRole){
        return await mileStoneRepo.getPendingSubmittalsForClient(clientAdminId, role)
    }

    async getPendingSubmittalsProjectManager(managerId:string, role?: UserRole){
        return await mileStoneRepo.getPendingSubmittalsForProjectManager(managerId, role)
    }

    async getPendingSubmittalsByConnectionDesignerEngineer(params:{
        userId:string,
        connectionDesignerId?:string | null,
        role?: UserRole
    }){
        return await mileStoneRepo.getPendingSubmittalsForConnectionDesignerEngineer(params)
    }
}
