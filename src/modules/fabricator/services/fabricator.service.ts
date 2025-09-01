import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { CreateFabricatorInput } from "../dtos";
import { FabricatorRepository } from "../repositories";


const fabRepo = new FabricatorRepository();


export class FabricatorService {
    async createFabricator(data: CreateFabricatorInput, userId: string) {
        const exsiting = await fabRepo.findByName(data.fabName);
        if(exsiting) throw new AppError('Fabricator already exists', 409);
       
        const fabricator= await fabRepo.create(
            {...data,files:data.files??[]},
            userId
        );
        return fabricator;
    }
    async getAllFabricators() {
        return fabRepo.findAll();
    }
    async getFabricatorById(id: string) {
        return fabRepo.findById({id});
    }
    async getFabricatorByCreatedById(createdById: string) {
        return fabRepo.findByCreatedById({id: createdById});
    }
    async updateFabricator(id: string, data: CreateFabricatorInput) {
        const existing = await fabRepo.findById({id});
        if(!existing) throw new AppError('Fabricator not found', 404);

        const fabricator = await fabRepo.update({id}, {...data,files:data.files??[]});
        return fabricator;
    }
    async deleteFabricator(id: string) {
        const existing = await fabRepo.findById({id});
        if(!existing) throw new AppError('Fabricator not found', 404);

        await fabRepo.delete({id});
        return { message: 'Fabricator deleted successfully' };
    }
    async getFile(fabricatorId: string, fileId: string) {
        const fabricator = await fabRepo.findById({ id: fabricatorId });
        if (!fabricator) throw new AppError('Fabricator not found', 404);

        const files = fabricator.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);

        return fileObject;
    }
}