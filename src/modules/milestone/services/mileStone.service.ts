import { AppError } from "../../../config/utils/AppError";
import { CreateMileStoneDto,UpdateMileStoneDto } from "../dtos";
import { MileStoneRepository } from "../repositories";

const mileStoneRepo= new MileStoneRepository();
export class MileStoneService{
    async create(data:CreateMileStoneDto){
        return await mileStoneRepo.create(data)
    }
    async update(id:string,data:UpdateMileStoneDto){
        return await mileStoneRepo.update(data,id)
    }
    async getAll(){
        return await mileStoneRepo.getAll()
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
}