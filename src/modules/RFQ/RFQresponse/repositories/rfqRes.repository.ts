import prisma from "../../../../config/database/client"
import { CreateRFQResponseInput,GetRFQResponseInput } from "../dtos"
import { cleandata } from "../../../../config/utils/cleanDataObject";
import { RFQStatus } from "@prisma/client";

export class RfqResponseRepository {
    async create(data: CreateRFQResponseInput) {
        const cleanedData = cleandata(data);
        return await prisma.rFQResponse.create({
            data: cleanedData,
            include:{
                 rfq:true,
                 user:true
            }
        });
    }

    async getById(params: GetRFQResponseInput) {
        return await prisma.rFQResponse.findUnique({
            where: {
                id: params.id
            },
            include: {
                parentResponse: true,
                childResponses: true,
                rfq: true,
                user:{
                    select:{
                        firstName:true,
                        middleName: true,
                        lastName:true,

                    }
                }
            }
        });
    }
    async update(parentResponseId: string,status:RFQStatus,wbtStatus:RFQStatus) {
        return await prisma.rFQResponse.update({
            where: {
                parentResponseId
            },
            data: { status,wbtStatus }
        });
    }
}