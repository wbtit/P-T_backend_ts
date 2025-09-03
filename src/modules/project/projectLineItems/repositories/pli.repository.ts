import { ipv4 } from "zod";
import prisma from "../../../../config/database/client";
import { PliInput,
    UpdatePliInput,
    GetPliByStageInput
 } from "../dtos";
import { cleandata} from "../../../../config/utils/cleanDataObject";

export class PLIRepository{
    async createPli(data:PliInput,projectID:string,workBreakDownID:string){
       return await prisma.projectLineItems.create({
           data: {
               ...cleandata(data),
               projectID,
               workBreakDownID
           }
       });
    }

    async updatePli(id:string,data:UpdatePliInput){
        return await prisma.projectLineItems.update({
            where: { id },
            data
        });
    }

    async getPliByStage(params:GetPliByStageInput){
        return await prisma.projectLineItems.findMany({
            where: {
                projectID: params.projectID,
                workBreakDownID: params.workBreakDownID,
                stage: params.stage
            }
        });
    }
}