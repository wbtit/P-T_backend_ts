import { AppError } from "../../../config/utils/AppError";
import { CreateFabricatorInput } from "../dtos";
import { FabricatorRepository } from "../repositories";

const fabRepo = new FabricatorRepository();


export class FabricatorService {
    async createFabricator(data: CreateFabricatorInput, userId: string) {
        const exsiting = await fabRepo.findByName(data.fabName);
        if(exsiting) throw new AppError('Fabricator already exists', 409);
       
        const fabricator= await fabRepo.create(data,userId);
        return fabricator;
    }
    async getAllFabricators() {
        return fabRepo.findAll();
    }
    async getFabricatorById(id: string) {
        return fabRepo.findById({id});
    }
    async updateFabricator(id: string, data: CreateFabricatorInput) {
        const existing = await fabRepo.findById({id});
        if(!existing) throw new AppError('Fabricator not found', 404);

        const fabricator = await fabRepo.update({id}, data);
        return fabricator;
    }
    async deleteFabricator(id: string) {
        const existing = await fabRepo.findById({id});
        if(!existing) throw new AppError('Fabricator not found', 404);

        await fabRepo.delete({id});
        return { message: 'Fabricator deleted successfully' };
    }
}