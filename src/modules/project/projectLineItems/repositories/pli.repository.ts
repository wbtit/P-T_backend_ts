import { ipv4 } from "zod";
import prisma from "../../../../config/database/client";
import { PliInput,
    UpdatePliInput,
    GetPliByStageInput
 } from "../dtos";
import { cleandata} from "../../../../config/utils/cleanDataObject";
import { Stage } from "@prisma/client";

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
    async getSumData(projectID:string,workBreakDownID:string,stage:Stage){
        return await prisma.projectLineItems.aggregate({
            where: {
                projectID,
                workBreakDownID,
                stage
            },
            _sum: {
                QtyNo: true,
                execHr: true,
                checkHr: true
            }
        });
    }
}