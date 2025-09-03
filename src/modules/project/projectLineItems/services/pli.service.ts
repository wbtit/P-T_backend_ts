import { PLIRepository } from "../repositories";
import { AppError } from "../../../../config/utils/AppError";
import { PliInput,
    UpdatePliInput,
    GetPliByStageInput
 } from "../dtos";

 const pliRepository = new PLIRepository();

 export class PLIService{
    async createPli(data:PliInput,projectID:string,workBreakDownID:string){
        try {
            return await pliRepository.createPli(data, projectID, workBreakDownID);
        } catch (error) {
            throw new AppError("Error creating PLI", 500);
        }
    }

    async updatePli(id:string,data:UpdatePliInput){
        try {
            return await pliRepository.updatePli(id, data);
        } catch (error) {
            throw new AppError("Error updating PLI", 500);
        }
    }

    async getPliByStage(params:GetPliByStageInput){
        try {
            return await pliRepository.getPliByStage(params);
        } catch (error) {
            throw new AppError("Error fetching PLI by stage", 500);
        }
    }
}