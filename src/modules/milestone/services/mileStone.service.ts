import { AppError } from "../../../config/utils/AppError";
import { CreateMileStoneDto,UpdateMileStoneDto } from "../dtos";
import { MileStoneRepository, MileStoneVersionRepository } from "../repositories";

const mileStoneRepo= new MileStoneRepository();
const mileStoneVersionRepo = new MileStoneVersionRepository();
export class MileStoneService{
    async create(data:CreateMileStoneDto){
        const milestone = await mileStoneRepo.create(data);
        await mileStoneVersionRepo.createInitialVersion(milestone.id, {
            approvalDate: milestone.approvalDate,
            status: milestone.status,
            stage: milestone.stage,
            subject: milestone.subject,
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
    async getAll(){
        return await mileStoneRepo.getAll()
    }
    async updateCompletion(id:string, isComplete:number){
        const existing = await mileStoneRepo.getById(id);
        if (!existing) {
            throw new AppError("MileStone not found", 404);
        }
        return await mileStoneRepo.updateCompletion(id, isComplete);
    }
    async getById(id:string){
        return await mileStoneRepo.getById(id)
    }
    async getByProjectId(id:string){
        return await mileStoneRepo.getByProject(id)
    }
    async delete(id:string){
        return await mileStoneRepo.delete(id)
    }
    async getPendingSubmittals(){
        return await mileStoneRepo.getPendingSubmittals()
    }
    async getPendingSubmittalsByFabricator(fabricatorId:string){
        return await mileStoneRepo.getPendingSubmittalsByFabricator(fabricatorId)
    }
    async getPendingSubmittalsByClient(clientAdminId:string){
        return await mileStoneRepo.getPendingSubmittalsForClient(clientAdminId)
    }
}
